package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieCardResponse;
import com.filmticket.dto.MovieResponse;
import com.filmticket.entity.Movie;
import com.filmticket.service.MovieService;
import com.filmticket.service.ShowtimeService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;
    private final ShowtimeService showtimeService;

    @Operation(summary = "List active movies")
    @GetMapping
    public ResponseEntity<ApiResponse<List<MovieResponse>>> listActiveMovies() {
        return ResponseEntity.ok(ApiResponse.success("Movies fetched successfully", movieService.getActiveMovies()));
    }

    @Operation(summary = "List now showing movies")
    @GetMapping("/now-showing")
    public ResponseEntity<ApiResponse<List<MovieCardResponse>>> listNowShowingMovies() {
        return ResponseEntity.ok(ApiResponse.success(
                "Now showing movies fetched successfully",
                movieService.getActiveMovieCardsByStatus(Movie.Status.NOW_SHOWING)
        ));
    }

    @Operation(summary = "List coming soon movies")
    @GetMapping("/coming-soon")
    public ResponseEntity<ApiResponse<List<MovieCardResponse>>> listComingSoonMovies() {
        return ResponseEntity.ok(ApiResponse.success(
                "Coming soon movies fetched successfully",
                movieService.getActiveMovieCardsByStatus(Movie.Status.COMING_SOON)
        ));
    }

    @Operation(summary = "Get movie detail")
    @GetMapping("/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> getActiveMovieById(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success("Movie fetched successfully", movieService.getActiveMovieById(movieId)));
    }

    @Operation(summary = "Get cinemas (rooms) showing this movie")
    @GetMapping("/{movieId}/cinemas")
    public ResponseEntity<ApiResponse<?>> getCinemasByMovie(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cinemas for movie fetched",
                showtimeService.getCinemasByMovie(movieId)
        ));
    }

    @Operation(summary = "Get available show dates for this movie")
    @GetMapping("/{movieId}/show-dates")
    public ResponseEntity<ApiResponse<List<LocalDate>>> getShowDatesByMovie(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Show dates for movie fetched",
                showtimeService.getShowDatesByMovie(movieId)
        ));
    }
}
