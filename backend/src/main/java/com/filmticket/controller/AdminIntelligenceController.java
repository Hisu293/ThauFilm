package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.service.AdminIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/intelligence")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminIntelligenceController {
    private final AdminIntelligenceService service;
    @GetMapping("/seat-heatmap") public ResponseEntity<ApiResponse<Map<String,Object>>> heatmap(@RequestParam UUID roomId) { return ResponseEntity.ok(ApiResponse.success("Seat heatmap generated", service.seatHeatmap(roomId))); }
    @GetMapping("/pricing") public ResponseEntity<ApiResponse<List<Map<String,Object>>>> pricing() { return ResponseEntity.ok(ApiResponse.success("Pricing suggestions generated", service.pricingSuggestions())); }
    @PostMapping("/pricing/{showtimeId}/apply") public ResponseEntity<ApiResponse<Map<String,Object>>> applyPricing(@PathVariable UUID showtimeId, @RequestBody PricingRequest request) { return ResponseEntity.ok(ApiResponse.success("Dynamic prices applied", service.applyPricing(showtimeId, request.prices()))); }
    @GetMapping("/weekly-plan") public ResponseEntity<ApiResponse<List<Map<String,Object>>>> weeklyPlan(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate) { return ResponseEntity.ok(ApiResponse.success("Weekly plan generated", service.weeklyPlan(startDate))); }
    @PostMapping("/weekly-plan/apply") public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> applyPlan(@RequestBody List<AdminIntelligenceService.WeeklyShowtimeRequest> plan) { return ResponseEntity.ok(ApiResponse.success("Weekly plan applied", service.applyWeeklyPlan(plan))); }
    public record PricingRequest(Map<String, BigDecimal> prices) {}
}
