package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.ReviewResponse;
import com.filmticket.service.AiReviewSummaryService;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/movies/{movieId}/reviews")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class ReviewController {

    private final ReviewService reviewService;
    private final AiReviewSummaryService aiReviewSummaryService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Get all reviews for a movie")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviews(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Reviews fetched successfully",
                reviewService.getReviewsByMovie(movieId)
        ));
    }

    @Operation(summary = "Create a review for a movie")
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID movieId,
            @Valid @RequestBody ReviewResponse.CreateRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        request.setMovieId(movieId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review created successfully",
                        reviewService.createReview(userId, request)));
    }

    @Operation(summary = "Update your review")
    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewResponse.UpdateRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Review updated successfully",
                reviewService.updateReview(userId, reviewId, request)
        ));
    }

    @Operation(summary = "Delete your review")
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID reviewId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        reviewService.deleteReview(userId, reviewId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get your review for a movie")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ReviewResponse>> getMyReview(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID movieId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        ReviewResponse review = reviewService.getReviewByUserAndMovie(userId, movieId);
        if (review == null) {
            return ResponseEntity.ok(ApiResponse.success("No review found", null));
        }
        return ResponseEntity.ok(ApiResponse.success("Review fetched successfully", review));
    }

    @Operation(summary = "Get review summary for a movie")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ReviewResponse.Summary>> getReviewSummary(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Review summary fetched successfully",
                reviewService.getReviewSummary(movieId)
        ));
    }

    @Operation(summary = "Check whether the current user has watched this movie")
    @GetMapping("/eligibility")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getReviewEligibility(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID movieId
    ) {
        boolean eligible = currentUserService.findUserId(user)
                .map(userId -> reviewService.canReview(userId, movieId))
                .orElse(false);
        return ResponseEntity.ok(ApiResponse.success(
                "Review eligibility fetched successfully",
                Map.of("eligible", eligible)
        ));
    }

    @Operation(summary = "Get AI-powered review summary for a movie")
    @GetMapping("/ai-summary")
    public ResponseEntity<ApiResponse<ReviewResponse.Summary>> getAiReviewSummary(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "AI review summary generated successfully",
                aiReviewSummaryService.getAiReviewSummary(movieId)
        ));
    }
}
