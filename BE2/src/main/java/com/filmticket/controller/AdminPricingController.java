package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.ComboRequest;
import com.filmticket.dto.ComboResponse;
import com.filmticket.dto.SeatTypePriceConfigRequest;
import com.filmticket.dto.SeatTypePriceConfigResponse;
import com.filmticket.dto.ShowtimePriceOverrideRequest;
import com.filmticket.dto.ShowtimePriceOverrideResponse;
import com.filmticket.service.AdminPricingService;
import com.filmticket.service.ComboService;
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
@RequestMapping("/api/admin/pricing")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminPricingController {

    private final AdminPricingService adminPricingService;
    private final ComboService comboService;

    @Operation(summary = "List seat type price configs")
    @GetMapping("/seat-types")
    public ResponseEntity<ApiResponse<List<SeatTypePriceConfigResponse>>> getSeatTypePriceConfigs() {
        return ResponseEntity.ok(ApiResponse.success("Seat type price configs fetched", adminPricingService.getSeatTypePriceConfigs()));
    }

    @Operation(summary = "Upsert seat type price config")
    @PostMapping("/seat-types")
    public ResponseEntity<ApiResponse<SeatTypePriceConfigResponse>> upsertSeatTypePriceConfig(
            @Valid @RequestBody SeatTypePriceConfigRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Seat type price config updated", adminPricingService.upsertSeatTypePriceConfig(request)));
    }

    @Operation(summary = "Get showtime price overrides")
    @GetMapping("/showtimes/{showtimeId}/overrides")
    public ResponseEntity<ApiResponse<List<ShowtimePriceOverrideResponse>>> getShowtimePriceOverrides(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success("Showtime price overrides fetched", adminPricingService.getShowtimePriceOverrides(showtimeId)));
    }

    @Operation(summary = "Set showtime price override")
    @PostMapping("/showtimes/overrides")
    public ResponseEntity<ApiResponse<ShowtimePriceOverrideResponse>> setShowtimePriceOverride(
            @Valid @RequestBody ShowtimePriceOverrideRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Showtime price override saved", adminPricingService.setShowtimePriceOverride(request)));
    }

    @Operation(summary = "Create combo")
    @PostMapping("/combos")
    public ResponseEntity<ApiResponse<ComboResponse>> createCombo(@Valid @RequestBody ComboRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Combo created", comboService.createCombo(request)));
    }

    @Operation(summary = "Update combo")
    @PutMapping("/combos/{comboId}")
    public ResponseEntity<ApiResponse<ComboResponse>> updateCombo(@PathVariable UUID comboId, @Valid @RequestBody ComboRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Combo updated", comboService.updateCombo(comboId, request)));
    }

    @Operation(summary = "Set combo active status")
    @PutMapping("/combos/{comboId}/active")
    public ResponseEntity<ApiResponse<Void>> setComboActive(@PathVariable UUID comboId, @RequestParam boolean active) {
        comboService.setComboActive(comboId, active);
        return ResponseEntity.ok(ApiResponse.success("Combo status updated", null));
    }

    @Operation(summary = "List active combos")
    @GetMapping("/combos")
    public ResponseEntity<ApiResponse<List<ComboResponse>>> getActiveCombos() {
        return ResponseEntity.ok(ApiResponse.success("Active combos fetched", comboService.getAllActiveCombos()));
    }
}
