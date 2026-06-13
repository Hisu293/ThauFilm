package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieCardResponse;
import com.filmticket.dto.MovieResponse;
import com.filmticket.entity.Movie;
import com.filmticket.service.MovieService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @Operation(summary = "List active movies for guests")
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

    @Operation(summary = "Get active movie detail for guests")
    @GetMapping("/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> getActiveMovieById(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success("Movie fetched successfully", movieService.getActiveMovieById(movieId)));
    }
}
