package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieMatchingDto;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.MovieMatchInteractionService;
import com.filmticket.service.MovieMatchingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/matching")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER','STAFF','ADMIN')")
public class MovieMatchingController {
    private final MovieMatchingService matchingService;
    private final CurrentUserService currentUserService;
    private final MovieMatchInteractionService interactionService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> profile(@AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải hồ sơ", matchingService.getProfile(userId(principal)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> saveProfile(
            @AuthenticationPrincipal UserDetails principal, @Valid @RequestBody MovieMatchingDto.ProfileRequest request) {
        return ok("Đã lưu hồ sơ", matchingService.saveProfile(userId(principal), request));
    }

    @PostMapping(value = "/profile/photo", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> uploadProfilePhoto(
            @AuthenticationPrincipal UserDetails principal, @RequestPart("image") MultipartFile image) {
        return ok("Đã cập nhật ảnh hồ sơ hẹn hò", matchingService.uploadProfilePhoto(userId(principal), image));
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<ApiResponse<MovieMatchingDto.ProfileResponse>> removeProfilePhoto(
            @AuthenticationPrincipal UserDetails principal) {
        return ok("Đã gỡ ảnh hồ sơ hẹn hò", matchingService.removeProfilePhoto(userId(principal)));
    }

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.ProfileResponse>>> candidates(@AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải danh sách gợi ý", matchingService.getCandidates(userId(principal)));
    }

    @GetMapping("/candidates/passed")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.ProfileResponse>>> passedCandidates(
            @AuthenticationPrincipal UserDetails principal) {
        return ok("Đã tải danh sách hồ sơ đã bỏ qua", matchingService.getPassedCandidates(userId(principal)));
    }

    @DeleteMapping("/candidates/{targetId}/action")
    public ResponseEntity<ApiResponse<Void>> restoreCandidate(
            @AuthenticationPrincipal UserDetails principal, @PathVariable UUID targetId) {
        matchingService.restoreCandidate(userId(principal), targetId);
        return ok("Đã đưa hồ sơ trở lại danh sách khám phá", null);
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

    @GetMapping("/matches/{matchId}/messages")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.MessageResponse>>> messages(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId) {
        return ok("Đã tải tin nhắn", interactionService.messages(userId(principal), matchId));
    }

    @PostMapping("/matches/{matchId}/messages")
    public ResponseEntity<ApiResponse<MovieMatchingDto.MessageResponse>> sendMessage(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId, @Valid @RequestBody MovieMatchingDto.MessageRequest request) {
        return ok("Đã gửi tin nhắn", interactionService.sendMessage(userId(principal), matchId, request.getContent()));
    }

    @GetMapping("/matches/{matchId}/invitations")
    public ResponseEntity<ApiResponse<List<MovieMatchingDto.InvitationResponse>>> invitations(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId) {
        return ok("Đã tải lời mời", interactionService.invitations(userId(principal), matchId));
    }

    @PostMapping("/matches/{matchId}/invitations")
    public ResponseEntity<ApiResponse<MovieMatchingDto.InvitationResponse>> invite(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId, @Valid @RequestBody MovieMatchingDto.InvitationRequest request) {
        return ok("Đã gửi lời mời", interactionService.invite(userId(principal), matchId, request.getShowtimeId()));
    }

    @PutMapping("/invitations/{invitationId}")
    public ResponseEntity<ApiResponse<MovieMatchingDto.InvitationResponse>> respond(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID invitationId, @Valid @RequestBody MovieMatchingDto.InvitationDecisionRequest request) {
        return ok("Đã phản hồi lời mời", interactionService.respond(userId(principal), invitationId, request.getDecision()));
    }

    @DeleteMapping("/matches/{matchId}")
    public ResponseEntity<ApiResponse<Void>> cancelMatch(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId) {
        interactionService.cancelMatch(userId(principal), matchId); return ok("Đã hủy match", null);
    }

    @PostMapping("/matches/{matchId}/block")
    public ResponseEntity<ApiResponse<Void>> block(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId) {
        interactionService.block(userId(principal), matchId); return ok("Đã chặn thành viên", null);
    }

    @PostMapping("/matches/{matchId}/report")
    public ResponseEntity<ApiResponse<Void>> report(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID matchId, @Valid @RequestBody MovieMatchingDto.ReportRequest request) {
        interactionService.report(userId(principal), matchId, request); return ok("Đã gửi báo cáo", null);
    }

    private UUID userId(UserDetails principal) { return currentUserService.requireUserId(principal); }
    private <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }
}
