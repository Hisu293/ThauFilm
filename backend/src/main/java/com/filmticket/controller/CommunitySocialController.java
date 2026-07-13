package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CommunityFeedResponse;
import com.filmticket.dto.CommunityPostCommentResponse;
import com.filmticket.dto.CommunityPostEngagementResponse;
import com.filmticket.dto.SocialConversationResponse;
import com.filmticket.dto.SocialMessageResponse;
import com.filmticket.service.CommunitySocialService;
import com.filmticket.service.CurrentUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/community")
@RequiredArgsConstructor
public class CommunitySocialController {
    private final CommunitySocialService communitySocialService;
    private final CurrentUserService currentUserService;

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<List<CommunityFeedResponse>>> feed(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tải bảng tin cộng đồng",
                communitySocialService.feed(currentUserService.requireUserId(principal))
        ));
    }

    @PostMapping(value = "/posts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CommunityFeedResponse>> createPost(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(name = "content", required = false) String content,
            @RequestPart(name = "image", required = false) MultipartFile image) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Đã đăng bài viết",
                communitySocialService.createPost(
                        currentUserService.requireUserId(principal), content, image)
        ));
    }

    @PutMapping(value = "/posts/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CommunityFeedResponse>> updatePost(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId,
            @RequestParam(name = "content", required = false) String content,
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestParam(name = "removeImage", defaultValue = "false") boolean removeImage) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật bài viết",
                communitySocialService.updatePost(
                        currentUserService.requireUserId(principal), postId, content, image, removeImage)
        ));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId) {
        communitySocialService.deletePost(currentUserService.requireUserId(principal), postId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<List<CommunityPostCommentResponse>>> comments(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tải bình luận",
                communitySocialService.comments(currentUserService.requireUserId(principal), postId)
        ));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<CommunityPostCommentResponse>> createComment(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId,
            @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Đã bình luận",
                communitySocialService.createComment(
                        currentUserService.requireUserId(principal), postId, request.getContent())
        ));
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId,
            @PathVariable UUID commentId) {
        communitySocialService.deleteComment(
                currentUserService.requireUserId(principal), postId, commentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/posts/{postId}/reaction")
    public ResponseEntity<ApiResponse<CommunityPostEngagementResponse>> react(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId,
            @RequestBody ReactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật biểu cảm",
                communitySocialService.react(
                        currentUserService.requireUserId(principal), postId, request.getType())
        ));
    }

    @PostMapping("/posts/{postId}/share")
    public ResponseEntity<ApiResponse<CommunityPostEngagementResponse>> share(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID postId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã chia sẻ bài viết",
                communitySocialService.share(currentUserService.requireUserId(principal), postId)
        ));
    }

    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<List<SocialConversationResponse>>> conversations(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tải hộp thư",
                communitySocialService.conversations(currentUserService.requireUserId(principal))
        ));
    }

    @GetMapping("/messages/{partnerId}")
    public ResponseEntity<ApiResponse<List<SocialMessageResponse>>> messages(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID partnerId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tải tin nhắn",
                communitySocialService.messages(currentUserService.requireUserId(principal), partnerId)
        ));
    }

    @PostMapping("/messages/{recipientId}")
    public ResponseEntity<ApiResponse<SocialMessageResponse>> send(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID recipientId,
            @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi tin nhắn",
                communitySocialService.send(
                        currentUserService.requireUserId(principal),
                        recipientId,
                        request.getContent()
                )
        ));
    }

    @Data
    public static class SendMessageRequest {
        private String content;
    }

    @Data
    public static class CommentRequest {
        private String content;
    }

    @Data
    public static class ReactionRequest {
        private String type;
    }

}
