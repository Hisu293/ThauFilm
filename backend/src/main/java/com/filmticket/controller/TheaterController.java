package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.TheaterMovieResponse;
import com.filmticket.dto.TheaterResponse;
import com.filmticket.dto.TheaterWithRoomsResponse;
import com.filmticket.service.TheaterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/theaters")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TheaterController {

    private final TheaterService theaterService;

    @Operation(summary = "Get all active theaters - Available for all authenticated users (MEMBER, STAFF, ADMIN)")
    @GetMapping
    @PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TheaterResponse>>> getAllTheaters(
            @RequestParam(required = false) String city) {

        List<TheaterResponse> theaters;

        // Kiểm tra xem Frontend có truyền tham số city lên không
        if (city != null && !city.isBlank()) {
            theaters = theaterService.getTheatersByCity(city);
        } else {
            // Nếu không truyền city, giữ nguyên logic cũ trả về tất cả rạp ACTIVE
            theaters = theaterService.getAllActiveTheaters();
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Theaters fetched successfully",
                theaters
        ));
    }

    @Operation(summary = "Get theater by ID with all rooms - Available for all authenticated users (MEMBER, STAFF, ADMIN)")
    @GetMapping("/{theaterId}")
    @PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<TheaterWithRoomsResponse>> getTheaterById(
            @PathVariable UUID theaterId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Theater fetched successfully",
                theaterService.getTheaterWithRooms(theaterId)
        ));
    }

    @Operation(summary = "Get all rooms in a theater - Available for all authenticated users (MEMBER, STAFF, ADMIN)")
    @GetMapping("/{theaterId}/rooms")
    @PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<CinemaRoomResponse>>> getRoomsByTheater(
            @PathVariable UUID theaterId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cinema rooms fetched successfully",
                theaterService.getRoomsByTheater(theaterId)
        ));
    }

    @Operation(summary = "Get theaters showing a specific movie - Available for all authenticated users (MEMBER, STAFF, ADMIN)")
    @GetMapping("/movie/{movieId}")
    @PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TheaterMovieResponse>>> getTheatersByMovie(
            @PathVariable UUID movieId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Theaters showing this movie fetched successfully",
                theaterService.getTheatersShowingMovie(movieId)
        ));
    }
}
