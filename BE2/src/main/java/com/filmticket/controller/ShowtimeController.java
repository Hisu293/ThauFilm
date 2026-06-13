package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.ShowtimeSeatResponse;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.service.BookingService;
import com.filmticket.service.ShowtimeService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;
    private final BookingService bookingService;

    @Operation(summary = "Get showtimes with optional filters")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> getShowtimes(
            @RequestParam(required = false) UUID movieId,
            @RequestParam(required = false) UUID theaterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<ShowtimeResponse> showtimes;

        if (movieId != null && theaterId != null) {
            showtimes = showtimeService.getShowtimesByMovieAndTheater(movieId, theaterId);
            return ResponseEntity.ok(ApiResponse.success(
                    "Showtimes for movie in theater fetched", showtimes));
        }

        if (theaterId != null) {
            showtimes = showtimeService.getShowtimesByTheater(theaterId);
            return ResponseEntity.ok(ApiResponse.success(
                    "Showtimes for theater fetched", showtimes));
        }

        if (movieId != null && date != null) {
            showtimes = showtimeService.getShowtimesByMovieAndDate(movieId, date);
            return ResponseEntity.ok(ApiResponse.success(
                    "Showtimes for movie on date fetched", showtimes));
        }

        if (movieId != null) {
            showtimes = showtimeService.getShowtimesByMovie(movieId);
            return ResponseEntity.ok(ApiResponse.success(
                    "Showtimes for movie fetched", showtimes));
        }

        if (date != null) {
            showtimes = showtimeService.getShowtimesByDate(date);
            return ResponseEntity.ok(ApiResponse.success(
                    "Showtimes by date fetched", showtimes));
        }

        showtimes = showtimeService.getAllShowtimes();
        return ResponseEntity.ok(ApiResponse.success(
                "All showtimes fetched", showtimes));
    }

    @Operation(summary = "Get showtimes by movie ID")
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> getShowtimesByMovie(
            @PathVariable UUID movieId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Showtimes for movie fetched",
                showtimeService.getShowtimesByMovie(movieId)
        ));
    }

    @Operation(summary = "Get seat map for a showtime")
    @GetMapping("/{showtimeId}/seats")
    public ResponseEntity<ApiResponse<List<ShowtimeSeatResponse>>> getShowtimeSeats(
            @PathVariable UUID showtimeId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Seat map fetched",
                bookingService.getAvailableSeats(showtimeId)
        ));
    }
}
