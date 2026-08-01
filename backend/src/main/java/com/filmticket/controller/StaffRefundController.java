package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.RefundRequestDto;
import com.filmticket.dto.RefundMessageDto;
import com.filmticket.entity.RefundRequestStatus;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.RefundRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STAFF')")
public class StaffRefundController {
    private final RefundRequestService refundService;
    private final CurrentUserService currentUserService;

    @GetMapping("/access")
    public ResponseEntity<ApiResponse<Map<String, Object>>> access(@AuthenticationPrincipal UserDetails principal) {
        return ok("Staff refund access fetched", refundService.staffAccess(userId(principal)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RefundRequestDto>>> list(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) RefundRequestStatus status) {
        return ok("Refund requests fetched", refundService.staffRequests(
                userId(principal), status, PageRequest.of(Math.max(0, page), 10)));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<ApiResponse<RefundRequestDto>> detail(
            @AuthenticationPrincipal UserDetails principal, @PathVariable UUID requestId) {
        return ok("Refund request fetched", refundService.staffRequest(userId(principal), requestId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RefundRequestDto>> create(@AuthenticationPrincipal UserDetails principal,
                                                                 @RequestBody CreateRefundBody body) {
        return ok("Refund request created", refundService.requestByStaff(userId(principal), body.bookingId(), body.ticketCode(), body.reason()));
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<ApiResponse<RefundRequestDto>> approve(@AuthenticationPrincipal UserDetails principal,
                                                                  @PathVariable UUID requestId) {
        return ok("Refund request reviewed", refundService.staffApprove(userId(principal), requestId));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<ApiResponse<RefundRequestDto>> reject(@AuthenticationPrincipal UserDetails principal,
                                                                 @PathVariable UUID requestId,
                                                                 @RequestBody RejectRefundBody body) {
        return ok("Refund request rejected", refundService.staffReject(userId(principal), requestId, body.reason()));
    }

    @GetMapping("/{requestId}/messages")
    public ResponseEntity<ApiResponse<List<RefundMessageDto>>> messages(@AuthenticationPrincipal UserDetails principal,
                                                                         @PathVariable UUID requestId) {
        return ok("Refund conversation fetched", refundService.staffMessages(userId(principal), requestId));
    }

    @PostMapping("/{requestId}/messages")
    public ResponseEntity<ApiResponse<RefundMessageDto>> message(@AuthenticationPrincipal UserDetails principal,
                                                                  @PathVariable UUID requestId,
                                                                  @RequestBody MessageBody body) {
        return ok("Message sent", refundService.staffMessage(userId(principal), requestId, body.content()));
    }

    private UUID userId(UserDetails principal) { return currentUserService.requireUserId(principal); }
    private <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) { return ResponseEntity.ok(ApiResponse.success(message, data)); }
    public record CreateRefundBody(UUID bookingId, String ticketCode, String reason) {}
    public record RejectRefundBody(String reason) {}
    public record MessageBody(String content) {}
}
