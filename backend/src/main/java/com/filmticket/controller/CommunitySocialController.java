package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CommunityFeedResponse;
import com.filmticket.dto.SocialConversationResponse;
import com.filmticket.dto.SocialMessageResponse;
import com.filmticket.service.CommunitySocialService;
import com.filmticket.service.CurrentUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
