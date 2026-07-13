package com.filmticket.service;

import com.filmticket.dto.CommunityFeedResponse;
import com.filmticket.dto.SocialConversationResponse;
import com.filmticket.dto.SocialMessageResponse;
import com.filmticket.entity.Review;
import com.filmticket.entity.SocialMessage;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.FollowRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ReviewRepository;
import com.filmticket.repository.SocialMessageRepository;
import com.filmticket.repository.UserRepository;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunitySocialService {
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final FollowRepository followRepository;
    private final ReviewRepository reviewRepository;
    private final SocialMessageRepository socialMessageRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final RealtimeEventService realtimeEventService;

    @Transactional(readOnly = true)
    public List<CommunityFeedResponse> feed(UUID userId) {
        List<UUID> followingIds = followRepository.findFollowingIdsByFollowerId(userId);
        if (followingIds.isEmpty()) return List.of();
        return reviewRepository.findTop50ByUserIdInOrderByCreatedAtDesc(followingIds).stream()
                .map(this::toFeedItem)
                .toList();
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

    private CommunityFeedResponse toFeedItem(Review review) {
        User author = userRepository.findById(review.getUserId()).orElse(null);
        var movie = movieRepository.findById(review.getMovieId()).orElse(null);
        return CommunityFeedResponse.builder()
                .reviewId(review.getId())
                .userId(review.getUserId())
                .userFullName(author == null ? "Thành viên" : author.getFullName())
                .userAvatarUrl(author == null ? null : author.getAvatarUrl())
                .movieId(review.getMovieId())
                .movieTitle(movie == null ? "Phim" : movie.getTitle())
                .moviePosterUrl(movie == null ? null : movie.getPosterUrl())
                .rating(review.getRating())
                .content(review.getContent())
                .createdAt(review.getCreatedAt())
                .build();
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
