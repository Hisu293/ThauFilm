package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.DiscountResponse;
import com.filmticket.service.DiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/discounts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class DiscountController {

    private final DiscountService discountService;

    @Operation(summary = "List active discounts")
    @GetMapping
    public ResponseEntity<ApiResponse<List<DiscountResponse>>> getActiveDiscounts() {
        return ResponseEntity.ok(ApiResponse.success(
                "Active discounts fetched",
                discountService.getActiveDiscounts()
        ));
    }
}
