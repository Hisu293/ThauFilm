package com.filmticket.service;

import com.filmticket.dto.ReviewResponse;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Review;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ReviewRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final BookingRepository bookingRepository;

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByMovie(UUID movieId) {
        return reviewRepository.findByMovieIdOrderByCreatedAtDesc(movieId).stream()
                .map(this::enrichWithUser)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByUser(UUID userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::enrichWithUser)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReviewResponse getReviewByUserAndMovie(UUID userId, UUID movieId) {
        return reviewRepository.findByUserIdAndMovieId(userId, movieId)
                .map(this::enrichWithUser)
                .orElse(null);
    }

    @Transactional
    public ReviewResponse createReview(UUID userId, ReviewResponse.CreateRequest request) {
        if (!movieRepository.existsById(request.getMovieId())) {
            throw new BadRequestException("Movie not found");
        }

        if (reviewRepository.existsByUserIdAndMovieId(userId, request.getMovieId())) {
            throw new BadRequestException("You have already reviewed this movie");
        }
        if (!canReview(userId, request.getMovieId())) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sau khi vé đã thanh toán và đến thời gian xem phim");
        }

        Review review = Review.builder()
                .userId(userId)
                .movieId(request.getMovieId())
                .rating(request.getRating())
                .content(request.getContent())
                .build();

        return enrichWithUser(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public boolean canReview(UUID userId, UUID movieId) {
        return bookingRepository.hasCompletedMovieBooking(
                userId, movieId, BookingStatus.CONFIRMED, LocalDateTime.now(VIETNAM_ZONE));
    }

    @Transactional
    public ReviewResponse updateReview(UUID userId, UUID reviewId, ReviewResponse.UpdateRequest request) {
        Review review = getReviewOrThrow(reviewId);

        if (!review.getUserId().equals(userId)) {
            throw new BadRequestException("You can only update your own review");
        }

        if (request.getRating() != null) {
            review.setRating(request.getRating());
        }
        if (request.getContent() != null) {
            review.setContent(request.getContent());
        }

        return enrichWithUser(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(UUID userId, UUID reviewId) {
        Review review = getReviewOrThrow(reviewId);

        if (!review.getUserId().equals(userId)) {
            throw new BadRequestException("You can only delete your own review");
        }

        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public ReviewResponse.Summary getReviewSummary(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }

        long total = reviewRepository.countByMovieId(movieId);
        Double avg = reviewRepository.findAverageRatingByMovieId(movieId);
        long positive = reviewRepository.countByMovieIdAndRatingGreaterThanEqual(movieId, 4);
        long negative = reviewRepository.countByMovieIdAndRatingLessThan(movieId, 4);

        return ReviewResponse.Summary.builder()
                .movieId(movieId)
                .totalReviews(total)
                .averageRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0)
                .positiveCount(positive)
                .negativeCount(negative)
                .positivePercentage(total > 0 ? Math.round((double) positive / total * 100) : 0)
                .build();
    }

    public List<String> getAllReviewContents(UUID movieId) {
        return reviewRepository.findAllReviewContentsByMovieId(movieId);
    }

    private Review getReviewOrThrow(UUID reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BadRequestException("Review not found"));
    }

    private ReviewResponse enrichWithUser(Review review) {
        ReviewResponse response = ReviewResponse.fromReview(review);
        userRepository.findById(review.getUserId()).ifPresent(user -> {
            response.setUserFullName(user.getFullName());
            response.setUserAvatarUrl(user.getAvatarUrl());
        });
        return response;
    }
}
