package com.filmticket.service;

import com.filmticket.dto.CommentResponse;
import com.filmticket.entity.Comment;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.CommentRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.UserRepository;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final RealtimeEventService realtimeEventService;

    @Transactional(readOnly = true)
    public List<CommentResponse> getCommentsByMovie(UUID movieId) {
        List<Comment> rootComments = commentRepository.findByMovieIdAndParentIdIsNullOrderByCreatedAtDesc(movieId);
        return rootComments.stream()
                .map(this::buildCommentTree)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse createComment(UUID userId, CommentResponse.CreateRequest request) {
        if (!movieRepository.existsById(request.getMovieId())) {
            throw new BadRequestException("Movie not found");
        }

        Comment parent = null;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new BadRequestException("Parent comment not found"));
            if (!parent.getMovieId().equals(request.getMovieId())) {
                throw new BadRequestException("Parent comment belongs to another movie");
            }
        }

        Comment comment = Comment.builder()
                .userId(userId)
                .movieId(request.getMovieId())
                .parentId(request.getParentId())
                .content(request.getContent())
                .build();

        CommentResponse response = enrichWithUser(commentRepository.save(comment));
        realtimeEventService.broadcastComment(request.getMovieId(), "CREATED", response);
        if (parent != null && !parent.getUserId().equals(userId)) {
            String actor = userRepository.findById(userId).map(user -> user.getFullName()).orElse("Một thành viên");
            realtimeEventService.notifyUser(parent.getUserId(), "COMMENT_REPLY", "Phản hồi mới",
                    actor + " đã trả lời bình luận của bạn", "/movies/" + request.getMovieId() + "/community");
        }
        return response;
    }

    @Transactional
    public CommentResponse updateComment(UUID userId, UUID commentId, String content) {
        Comment comment = getCommentOrThrow(commentId);

        if (!comment.getUserId().equals(userId)) {
            throw new BadRequestException("You can only update your own comment");
        }

        if (content == null || content.isBlank()) throw new BadRequestException("Comment content is required");
        comment.setContent(content.trim());
        CommentResponse response = enrichWithUser(commentRepository.save(comment));
        realtimeEventService.broadcastComment(comment.getMovieId(), "UPDATED", response);
        return response;
    }

    @Transactional
    public void deleteComment(UUID userId, UUID commentId) {
        Comment comment = getCommentOrThrow(commentId);

        if (!comment.getUserId().equals(userId)) {
            throw new BadRequestException("You can only delete your own comment");
        }

        UUID movieId = comment.getMovieId();
        commentRepository.delete(comment);
        realtimeEventService.broadcastComment(movieId, "DELETED", java.util.Map.of("id", commentId));
    }

    @Transactional(readOnly = true)
    public long getCommentCount(UUID movieId) {
        return commentRepository.countByMovieId(movieId);
    }

    private CommentResponse buildCommentTree(Comment comment) {
        CommentResponse response = enrichWithUser(comment);
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(comment.getId());
        if (!replies.isEmpty()) {
            response.setReplies(replies.stream()
                    .map(this::buildCommentTree)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private Comment getCommentOrThrow(UUID commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new BadRequestException("Comment not found"));
    }

    private CommentResponse enrichWithUser(Comment comment) {
        CommentResponse response = CommentResponse.fromComment(comment);
        userRepository.findById(comment.getUserId()).ifPresent(user -> {
            response.setUserFullName(user.getFullName());
            response.setUserAvatarUrl(user.getAvatarUrl());
        });
        return response;
    }
}
