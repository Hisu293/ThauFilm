package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.RefundRequestDto;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.RefundRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRefundController {
    private final RefundRequestService refundService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RefundRequestDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Refund requests fetched", refundService.adminRequests()));
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

    public record RejectRefundBody(String reason) {}
}
