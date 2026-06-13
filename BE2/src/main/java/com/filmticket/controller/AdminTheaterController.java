package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.TheaterDetailResponse;
import com.filmticket.dto.TheaterRequest;
import com.filmticket.dto.TheaterResponse;
import com.filmticket.service.TheaterService;
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
@RequestMapping("/api/admin/theaters")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminTheaterController {

    private final TheaterService theaterService;

    @Operation(summary = "List all theaters")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TheaterResponse>>> getAllTheaters() {
        return ResponseEntity.ok(ApiResponse.success(
                "Theaters fetched successfully",
                theaterService.getAllTheaters()
        ));
    }

    @Operation(summary = "Get theater by ID with details")
    @GetMapping("/{theaterId}")
    public ResponseEntity<ApiResponse<TheaterDetailResponse>> getTheaterById(
            @PathVariable UUID theaterId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Theater fetched successfully",
                theaterService.getTheaterDetail(theaterId)
        ));
    }

    @Operation(summary = "Create a new theater")
    @PostMapping
    public ResponseEntity<ApiResponse<TheaterResponse>> createTheater(
            @Valid @RequestBody TheaterRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Theater created successfully",
                        theaterService.createTheater(request)
                ));
    }

    @Operation(summary = "Update a theater")
    @PutMapping("/{theaterId}")
    public ResponseEntity<ApiResponse<TheaterResponse>> updateTheater(
            @PathVariable UUID theaterId,
            @Valid @RequestBody TheaterRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Theater updated successfully",
                theaterService.updateTheater(theaterId, request)
        ));
    }

    @Operation(summary = "Delete a theater (soft delete)")
    @DeleteMapping("/{theaterId}")
    public ResponseEntity<Void> deleteTheater(@PathVariable UUID theaterId) {
        theaterService.deleteTheater(theaterId);
        return ResponseEntity.noContent().build();
    }
}
