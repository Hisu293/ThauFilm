package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.UserNotificationDto;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
public class UserNotificationController {
    private final UserNotificationService notificationService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserNotificationDto>>> recent(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã tải thông báo", notificationService.recent(userId(principal))));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<UserNotificationDto>> markRead(
            @AuthenticationPrincipal UserDetails principal, @PathVariable UUID notificationId) {
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu thông báo là đã đọc",
                notificationService.markRead(userId(principal), notificationId)));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal UserDetails principal) {
        notificationService.markAllRead(userId(principal));
        return ResponseEntity.ok(ApiResponse.<Void>success("Đã đọc tất cả thông báo", null));
    }

    private UUID userId(UserDetails principal) { return currentUserService.requireUserId(principal); }
}
