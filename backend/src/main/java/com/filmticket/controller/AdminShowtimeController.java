package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.DemandPredictionResponse.ShowtimeSuggestion;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.service.ShowtimeService;
import com.filmticket.service.DemandPredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminShowtimeController {

    private final ShowtimeService showtimeService;
    private final DemandPredictionService demandPredictionService;

    @Operation(summary = "Suggest the three highest-demand available showtimes")
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<ShowtimeSuggestion>>> suggestions(
            @RequestParam UUID movieId,
            @RequestParam(required = false) LocalDate fromDate
    ) {
        return ResponseEntity.ok(ApiResponse.success("Showtime suggestions generated",
                demandPredictionService.suggest(movieId, fromDate)));
    }

    @Operation(summary = "List all showtimes")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> getAllShowtimes() {
        return ResponseEntity.ok(ApiResponse.success("Showtimes fetched successfully", showtimeService.getAllShowtimes()));
    }

    @Operation(summary = "Create a showtime")
    @PostMapping
    public ResponseEntity<ApiResponse<ShowtimeResponse>> createShowtime(
            @Valid @RequestBody UpsertShowtimeRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Showtime created successfully", showtimeService.createShowtime(request)));
    }

    @Operation(summary = "Update a showtime")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> updateShowtime(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertShowtimeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Showtime updated successfully", showtimeService.updateShowtime(id, request)));
    }

    @Operation(summary = "Delete a showtime")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable UUID id) {
        showtimeService.deleteShowtime(id);
        return ResponseEntity.noContent().build();
    }
}
