package com.filmticket.repository;

import com.filmticket.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    List<Review> findByMovieIdOrderByCreatedAtDesc(UUID movieId);

    List<Review> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Review> findTop50ByUserIdInOrderByCreatedAtDesc(List<UUID> userIds);

    Optional<Review> findByUserIdAndMovieId(UUID userId, UUID movieId);

    boolean existsByUserIdAndMovieId(UUID userId, UUID movieId);

    long countByMovieId(UUID movieId);

    long countByMovieIdAndRatingGreaterThanEqual(UUID movieId, int minRating);

    long countByMovieIdAndRatingLessThan(UUID movieId, int maxRating);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.movieId = :movieId")
    Double findAverageRatingByMovieId(@Param("movieId") UUID movieId);

    @Query("SELECT r.content FROM Review r WHERE r.movieId = :movieId AND r.content IS NOT NULL AND r.content <> ''")
    List<String> findAllReviewContentsByMovieId(@Param("movieId") UUID movieId);
}
