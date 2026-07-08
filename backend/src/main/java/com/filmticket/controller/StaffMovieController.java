package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieResponse;
import com.filmticket.dto.StaffMovieRequest;
import com.filmticket.service.StaffMovieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/movies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffMovieController {

    private final StaffMovieService staffMovieService;

    @Operation(summary = "List movies for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<MovieResponse>>> listMovies() {
        return ResponseEntity.ok(ApiResponse.success("Movies fetched successfully", staffMovieService.listMovies()));
    }

    @Operation(summary = "Get movie detail for staff")
    @GetMapping("/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> getMovie(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success("Movie fetched successfully", staffMovieService.getMovie(movieId)));
    }

    @Operation(summary = "Update movie details (poster/trailer/description/release date)")
    @PutMapping("/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> updateMovie(
            @PathVariable UUID movieId,
            @Valid @RequestBody StaffMovieRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Movie updated successfully", staffMovieService.updateMovie(movieId, request)));
    }
}
