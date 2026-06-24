package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieMatchingDto;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.MovieMatchingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/matching")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER','STAFF','ADMIN')")
public class MovieMatchingController {
    private final MovieMatchingService matchingService;
    private final CurrentUserService currentUserService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> profile(@AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải hồ sơ", matchingService.getProfile(userId(principal)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> saveProfile(
            @AuthenticationPrincipal UserDetails principal, @Valid @RequestBody MovieMatchingDto.ProfileRequest request) {
        return ok("Đã lưu hồ sơ", matchingService.saveProfile(userId(principal), request));
    }

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.ProfileResponse>>> candidates(@AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải danh sách gợi ý", matchingService.getCandidates(userId(principal)));
    }

    @PostMapping("/candidates/{targetId}/action")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ActionResponse>> act(
            @AuthenticationPrincipal UserDetails principal, @PathVariable UUID targetId,
            @Valid @RequestBody MovieMatchingDto.ActionRequest request) {
        return ok("Đã ghi nhận lựa chọn", matchingService.act(userId(principal), targetId, request.getDecision()));
    }

    @GetMapping("/matches")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.MatchResponse>>> matches(@AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải danh sách match", matchingService.getMatches(userId(principal)));
    }

    private UUID userId(UserDetails principal) { return currentUserService.requireUserId(principal); }
    private <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }
}
