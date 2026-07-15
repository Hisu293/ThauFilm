package com.filmticket.controller;

import com.filmticket.dto.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.LoyaltyService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/loyalty")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class LoyaltyController {
    private final LoyaltyService loyaltyService;
    private final UserRepository userRepository;
    @GetMapping
    public ResponseEntity<ApiResponse<LoyaltyOverviewResponse>> overview() {
        return ResponseEntity.ok(ApiResponse.success("Đã tải thông tin điểm thưởng", loyaltyService.getOverview(currentUserId())));
    }
    @PostMapping("/rewards/{rewardId}/redeem")
    public ResponseEntity<ApiResponse<LoyaltyOverviewResponse.RedemptionItem>> redeem(@PathVariable UUID rewardId) {
        return ResponseEntity.ok(ApiResponse.success("Đổi điểm thành công", loyaltyService.redeem(currentUserId(), rewardId)));
    }
    private UUID currentUserId() {
        UserDetails principal = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng")).getId();
    }
}
