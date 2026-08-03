package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.DiscountResponse;
import com.filmticket.dto.StaffPromotionRequest;
import com.filmticket.service.StaffPromotionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffPromotionController {

    private final StaffPromotionService staffPromotionService;

    @Operation(summary = "List promotions for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<DiscountResponse>>> listPromotions() {
        return ResponseEntity.ok(ApiResponse.success("Đã tải danh sách chiến dịch khuyến mãi", staffPromotionService.listPromotions()));
    }

    @Operation(summary = "Create promotion")
    @PostMapping
    public ResponseEntity<ApiResponse<DiscountResponse>> createPromotion(@Valid @RequestBody StaffPromotionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo chiến dịch khuyến mãi", staffPromotionService.createPromotion(request)));
    }

    @Operation(summary = "Get promotion detail")
    @GetMapping("/{promotionId}")
    public ResponseEntity<ApiResponse<DiscountResponse>> getPromotion(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(ApiResponse.success("Đã tải chi tiết chiến dịch khuyến mãi", staffPromotionService.getPromotion(promotionId)));
    }

    @Operation(summary = "Update promotion")
    @PutMapping("/{promotionId}")
    public ResponseEntity<ApiResponse<DiscountResponse>> updatePromotion(
            @PathVariable UUID promotionId,
            @Valid @RequestBody StaffPromotionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật chiến dịch khuyến mãi", staffPromotionService.updatePromotion(promotionId, request)));
    }

    @Operation(summary = "Enable promotion")
    @PutMapping("/{promotionId}/enable")
    public ResponseEntity<ApiResponse<DiscountResponse>> enablePromotion(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(ApiResponse.success("Đã kích hoạt chiến dịch khuyến mãi", staffPromotionService.enablePromotion(promotionId)));
    }

    @Operation(summary = "Disable promotion")
    @PutMapping("/{promotionId}/disable")
    public ResponseEntity<ApiResponse<DiscountResponse>> disablePromotion(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạm ngưng chiến dịch khuyến mãi", staffPromotionService.disablePromotion(promotionId)));
    }

    @Operation(summary = "Get promotion usage tracking")
    @GetMapping("/{promotionId}/usage")
    public ResponseEntity<ApiResponse<?>> getUsage(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(ApiResponse.success("Đã tải thống kê lượt sử dụng", staffPromotionService.getUsage(promotionId)));
    }

    @Operation(summary = "Xem dashboard hiệu quả chiến dịch")
    @GetMapping("/{promotionId}/dashboard")
    public ResponseEntity<ApiResponse<?>> getDashboard(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(ApiResponse.success("Đã tải dashboard chiến dịch", staffPromotionService.getDashboard(promotionId)));
    }
}
