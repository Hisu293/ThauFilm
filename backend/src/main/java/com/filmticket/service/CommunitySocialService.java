package com.filmticket.service;

import com.filmticket.dto.CommunityFeedResponse;
import com.filmticket.dto.SocialConversationResponse;
import com.filmticket.dto.SocialMessageResponse;
import com.filmticket.entity.CommunityPost;
import com.filmticket.entity.Review;
import com.filmticket.entity.SocialMessage;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.FollowRepository;
import com.filmticket.repository.CommunityPostRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ReviewRepository;
import com.filmticket.repository.SocialMessageRepository;
import com.filmticket.repository.UserRepository;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunitySocialService {
    private static final int MAX_MESSAGE_LENGTH = 2000;
    private static final int MAX_POST_LENGTH = 5000;

    private final FollowRepository followRepository;
    private final CommunityPostRepository communityPostRepository;
    private final ReviewRepository reviewRepository;
    private final SocialMessageRepository socialMessageRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final RealtimeEventService realtimeEventService;
    private final CloudinaryStorageService cloudinaryStorageService;

    @Transactional(readOnly = true)
    public List<CommunityFeedResponse> feed(UUID userId) {
        List<UUID> visibleUserIds = new ArrayList<>(followRepository.findFollowingIdsByFollowerId(userId));
        visibleUserIds.add(userId);

        List<CommunityFeedResponse> items = new ArrayList<>();
        reviewRepository.findTop50ByUserIdInOrderByCreatedAtDesc(visibleUserIds).stream()
                .map(review -> toReviewFeedItem(review, userId))
                .forEach(items::add);
        communityPostRepository.findTop50ByUserIdInOrderByCreatedAtDesc(visibleUserIds).stream()
                .map(post -> toPostFeedItem(post, userId))
                .forEach(items::add);

        return items.stream()
                .sorted(Comparator.comparing(CommunityFeedResponse::getCreatedAt).reversed())
                .limit(50)
                .toList();
    }

    @Transactional
    public CommunityFeedResponse createPost(UUID userId, String rawContent, MultipartFile image) {
        String content = validateContent(rawContent);
        boolean hasImage = image != null && !image.isEmpty();
        if (content == null && !hasImage) {
            throw new BadRequestException("Bài viết phải có nội dung hoặc hình ảnh");
        }
        CloudinaryStorageService.UploadedImage uploaded = hasImage ? cloudinaryStorageService.upload(image) : null;
        CommunityPost post = CommunityPost.builder()
                .userId(userId)
                .content(content)
                .imageUrl(uploaded == null ? null : uploaded.secureUrl())
                .imagePublicId(uploaded == null ? null : uploaded.publicId())
                .build();
        try {
            return toPostFeedItem(communityPostRepository.save(post), userId);
        } catch (RuntimeException exception) {
            if (uploaded != null) cloudinaryStorageService.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Transactional
    public CommunityFeedResponse updatePost(
            UUID userId, UUID postId, String rawContent, MultipartFile image, boolean removeImage) {
        CommunityPost post = ownedPost(userId, postId);
        String content = validateContent(rawContent);
        boolean hasNewImage = image != null && !image.isEmpty();
        boolean keepsImage = hasNewImage || (!removeImage && post.getImageUrl() != null);
        if (content == null && !keepsImage) {
            throw new BadRequestException("Bài viết phải có nội dung hoặc hình ảnh");
        }

        String oldPublicId = post.getImagePublicId();
        CloudinaryStorageService.UploadedImage uploaded = hasNewImage ? cloudinaryStorageService.upload(image) : null;
        post.setContent(content);
        if (uploaded != null) {
            post.setImageUrl(uploaded.secureUrl());
            post.setImagePublicId(uploaded.publicId());
        } else if (removeImage) {
            post.setImageUrl(null);
            post.setImagePublicId(null);
        }

        try {
            CommunityFeedResponse response = toPostFeedItem(communityPostRepository.save(post), userId);
            if ((uploaded != null || removeImage) && oldPublicId != null) {
                cloudinaryStorageService.deleteQuietly(oldPublicId);
            }
            return response;
        } catch (RuntimeException exception) {
            if (uploaded != null) cloudinaryStorageService.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Transactional
    public void deletePost(UUID userId, UUID postId) {
        CommunityPost post = ownedPost(userId, postId);
        communityPostRepository.delete(post);
        cloudinaryStorageService.deleteQuietly(post.getImagePublicId());
    }

    @Transactional(readOnly = true)
    public List<SocialConversationResponse> conversations(UUID userId) {
        Map<UUID, List<SocialMessage>> byPartner = new LinkedHashMap<>();
        for (SocialMessage message : socialMessageRepository.findAllForUser(userId)) {
            UUID partnerId = message.getSenderId().equals(userId)
                    ? message.getRecipientId()
                    : message.getSenderId();
            byPartner.computeIfAbsent(partnerId, ignored -> new ArrayList<>()).add(message);
        }
        return byPartner.entrySet().stream().map(entry -> {
            User partner = userRepository.findById(entry.getKey()).orElse(null);
            SocialMessage latest = entry.getValue().get(0);
            long unread = entry.getValue().stream()
                    .filter(message -> message.getRecipientId().equals(userId) && message.getReadAt() == null)
                    .count();
            return SocialConversationResponse.builder()
                    .userId(entry.getKey())
                    .fullName(partner == null ? "Thành viên" : partner.getFullName())
                    .avatarUrl(partner == null ? null : partner.getAvatarUrl())
                    .lastMessage(latest.getContent())
                    .lastMessageAt(latest.getCreatedAt())
                    .unreadCount(unread)
                    .mutualFollow(isMutual(userId, entry.getKey()))
                    .build();
        }).toList();
    }

    @Transactional
    public List<SocialMessageResponse> messages(UUID userId, UUID partnerId) {
        requireExistingUser(partnerId);
        List<SocialMessage> messages = socialMessageRepository.findConversation(userId, partnerId);
        LocalDateTime now = LocalDateTime.now();
        messages.stream()
                .filter(message -> message.getRecipientId().equals(userId) && message.getReadAt() == null)
                .forEach(message -> message.setReadAt(now));
        return messages.stream().map(this::toMessage).toList();
    }

    @Transactional
    public SocialMessageResponse send(UUID senderId, UUID recipientId, String rawContent) {
        if (senderId.equals(recipientId)) {
            throw new BadRequestException("Bạn không thể nhắn tin cho chính mình");
        }
        requireExistingUser(recipientId);
        if (!isMutual(senderId, recipientId)) {
            throw new BadRequestException("Chỉ có thể nhắn tin khi hai người theo dõi lẫn nhau");
        }
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isEmpty()) throw new BadRequestException("Nội dung tin nhắn không được để trống");
        if (content.length() > MAX_MESSAGE_LENGTH) {
            throw new BadRequestException("Tin nhắn không được vượt quá 2000 ký tự");
        }
        SocialMessage message = socialMessageRepository.save(SocialMessage.builder()
                .senderId(senderId)
                .recipientId(recipientId)
                .content(content)
                .build());
        SocialMessageResponse response = toMessage(message);
        realtimeEventService.sendUserEvent(recipientId, "SOCIAL_MESSAGE", response);
        return response;
    }

    private boolean isMutual(UUID firstId, UUID secondId) {
        return followRepository.existsByFollowerIdAndFollowingId(firstId, secondId)
                && followRepository.existsByFollowerIdAndFollowingId(secondId, firstId);
    }

    private void requireExistingUser(UUID userId) {
        if (!userRepository.existsById(userId)) throw new BadRequestException("Không tìm thấy người dùng");
    }

    private CommunityFeedResponse toReviewFeedItem(Review review, UUID viewerId) {
        User author = userRepository.findById(review.getUserId()).orElse(null);
        var movie = movieRepository.findById(review.getMovieId()).orElse(null);
        return CommunityFeedResponse.builder()
                .id(review.getId())
                .itemType("REVIEW")
                .reviewId(review.getId())
                .userId(review.getUserId())
                .userFullName(author == null ? "Thành viên" : author.getFullName())
                .userAvatarUrl(author == null ? null : author.getAvatarUrl())
                .movieId(review.getMovieId())
                .movieTitle(movie == null ? "Phim" : movie.getTitle())
                .moviePosterUrl(movie == null ? null : movie.getPosterUrl())
                .rating(review.getRating())
                .content(review.getContent())
                .owner(review.getUserId().equals(viewerId))
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getCreatedAt())
                .build();
    }

    private CommunityFeedResponse toPostFeedItem(CommunityPost post, UUID viewerId) {
        User author = userRepository.findById(post.getUserId()).orElse(null);
        return CommunityFeedResponse.builder()
                .id(post.getId())
                .itemType("POST")
                .postId(post.getId())
                .userId(post.getUserId())
                .userFullName(author == null ? "Thành viên" : author.getFullName())
                .userAvatarUrl(author == null ? null : author.getAvatarUrl())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .owner(post.getUserId().equals(viewerId))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private CommunityPost ownedPost(UUID userId, UUID postId) {
        return communityPostRepository.findByIdAndUserId(postId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bài viết hoặc bạn không có quyền chỉnh sửa"));
    }

    private String validateContent(String rawContent) {
        String content = normalize(rawContent);
        if (content != null && content.length() > MAX_POST_LENGTH) {
            throw new BadRequestException("Nội dung bài viết không được vượt quá 5000 ký tự");
        }
        return content;
    }

    private String normalize(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private SocialMessageResponse toMessage(SocialMessage message) {
        return SocialMessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .recipientId(message.getRecipientId())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .build();
    }
}
