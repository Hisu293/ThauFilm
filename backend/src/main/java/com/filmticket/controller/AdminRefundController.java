package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.RefundRequestDto;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRefundController {
    private final RefundRequestService refundService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RefundRequestDto>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) RefundRequestStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Refund requests fetched",
                refundService.adminRequests(status, PageRequest.of(Math.max(0, page), 10))));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<ApiResponse<RefundRequestDto>> detail(@PathVariable UUID requestId) {
        return ResponseEntity.ok(ApiResponse.success("Refund request fetched",
                refundService.adminRequest(requestId)));
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<ApiResponse<RefundRequestDto>> approve(@AuthenticationPrincipal UserDetails principal,
                                                                  @PathVariable UUID requestId) {
        return ResponseEntity.ok(ApiResponse.success("Refund approved",
                refundService.adminApprove(currentUserService.requireUserId(principal), requestId)));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<ApiResponse<RefundRequestDto>> reject(@AuthenticationPrincipal UserDetails principal,
                                                                 @PathVariable UUID requestId,
                                                                 @RequestBody RejectRefundBody body) {
        return ResponseEntity.ok(ApiResponse.success("Refund rejected",
                refundService.adminReject(currentUserService.requireUserId(principal), requestId, body.reason())));
    }

    @PostMapping("/{requestId}/retry-automatic")
    public ResponseEntity<ApiResponse<RefundRequestDto>> retryAutomatic(
            @AuthenticationPrincipal UserDetails principal, @PathVariable UUID requestId) {
        return ResponseEntity.ok(ApiResponse.success("Automatic refund retried",
                refundService.retryAutomaticRefund(
                        currentUserService.requireUserId(principal), requestId)));
    }

    public record RejectRefundBody(String reason) {}
}
