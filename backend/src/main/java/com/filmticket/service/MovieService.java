package com.filmticket.service;

import com.filmticket.dto.MovieCardResponse;
import com.filmticket.dto.MovieResponse;
import com.filmticket.entity.Movie;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.MovieRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movieRepository;
    private final MovieEventService movieEventService;
    private final S3PresignedUrlService s3PresignedUrlService;

    @Transactional(readOnly = true)
    public List<MovieResponse> getAllMovies() {
        return movieRepository.findAll().stream()
                .map(movie -> MovieResponse.fromMovieWithStream(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> getActiveMovies() {
        return movieRepository.findAllByActiveTrue().stream()
                .map(movie -> MovieResponse.fromMovie(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovieCardResponse> getActiveMovieCards() {
        return movieRepository.findAllByActiveTrue().stream()
                .map(movie -> MovieCardResponse.fromMovie(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovieCardResponse> getActiveMovieCardsByStatus(Movie.Status status) {
        return movieRepository.findAllByActiveTrueAndStatus(status).stream()
                .map(movie -> MovieCardResponse.fromMovie(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie)))
                .toList();
    }

    @Transactional(readOnly = true)
    public MovieResponse getActiveMovieById(UUID movieId) {
        Movie movie = getMovieEntityOrThrow(movieId);
        if (!movie.isActive()) {
            throw new BadRequestException("Movie is not available");
        }
        return MovieResponse.fromMovie(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie));
    }

    @Transactional(readOnly = true)
    public MovieResponse getMovieById(UUID movieId) {
        Movie movie = getMovieEntityOrThrow(movieId);
        return MovieResponse.fromMovieWithStream(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie));
    }

    @Transactional
    public MovieResponse createMovie(@Valid UpsertMovieRequest request) {
        validateTitleUniqueness(request.getTitle(), null);

        Movie movie = Movie.builder()
                .title(normalize(request.getTitle()))
                .description(normalizeNullable(request.getDescription()))
                .durationMinutes(request.getDurationMinutes())
                .rating(request.getRating())
                .active(Boolean.TRUE.equals(request.getActive()))
                .posterUrl(normalizeNullable(request.getPosterUrl()))
                .trailerUrl(normalizeNullable(request.getTrailerUrl()))
                .director(normalizeNullable(request.getDirector()))
                .actors(normalizeNullable(request.getActors()))
                .genre(normalizeNullable(request.getGenre()))
                .releaseDate(request.getReleaseDate())
                .language(normalizeNullable(request.getLanguage()))
                .rated(normalizeNullable(request.getRated()))
                .streamProvider(normalizeNullable(request.getStreamProvider()))
                .streamKey(normalizeNullable(request.getStreamKey()))
                .status(request.getStatus() == null ? Movie.Status.COMING_SOON : request.getStatus())
                .build();

        Movie saved = movieRepository.save(movie);
        MovieResponse response = MovieResponse.fromMovieWithStream(saved, resolvePosterUrl(saved), resolveTrailerUrl(saved));
        movieEventService.publishMovieCreated(response);
        return response;
    }

    @Transactional
    public MovieResponse updateMovie(UUID movieId, @Valid UpsertMovieRequest request) {
        Movie movie = getMovieEntityOrThrow(movieId);
        validateTitleUniqueness(request.getTitle(), movieId);

        movie.setTitle(normalize(request.getTitle()));
        movie.setDescription(normalizeNullable(request.getDescription()));
        movie.setDurationMinutes(request.getDurationMinutes());
        movie.setRating(request.getRating());
        movie.setActive(Boolean.TRUE.equals(request.getActive()));
        movie.setPosterUrl(normalizeNullable(request.getPosterUrl()));
        movie.setTrailerUrl(normalizeNullable(request.getTrailerUrl()));
        movie.setDirector(normalizeNullable(request.getDirector()));
        movie.setActors(normalizeNullable(request.getActors()));
        movie.setGenre(normalizeNullable(request.getGenre()));
        movie.setReleaseDate(request.getReleaseDate());
        movie.setLanguage(normalizeNullable(request.getLanguage()));
        movie.setRated(normalizeNullable(request.getRated()));
        movie.setStreamProvider(normalizeNullable(request.getStreamProvider()));
        movie.setStreamKey(normalizeNullable(request.getStreamKey()));
        movie.setStatus(request.getStatus() == null ? Movie.Status.COMING_SOON : request.getStatus());

        Movie saved = movieRepository.save(movie);
        MovieResponse response = MovieResponse.fromMovieWithStream(saved, resolvePosterUrl(saved), resolveTrailerUrl(saved));
        movieEventService.publishMovieUpdated(response);
        return response;
    }

    @Transactional
    public void deleteMovie(UUID movieId) {
        Movie movie = getMovieEntityOrThrow(movieId);
        movieRepository.delete(movie);
        movieEventService.publishMovieDeleted(movieId);
    }

    public Movie getMovieEntityOrThrow(UUID movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));
    }

    private void validateTitleUniqueness(String title, UUID movieId) {
        String normalizedTitle = normalize(title);
        boolean exists = movieId == null
                ? movieRepository.existsByTitleIgnoreCase(normalizedTitle)
                : movieRepository.existsByTitleIgnoreCaseAndIdNot(normalizedTitle, movieId);

        if (exists) {
            throw new BadRequestException("Movie title already exists");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeNullable(String value) {
        String normalized = normalize(value);
        return normalized == null || normalized.isBlank() ? null : normalized;
    }

    private String resolvePosterUrl(Movie movie) {
        return s3PresignedUrlService.resolvePosterUrl(movie.getPosterUrl());
    }

    private String resolveTrailerUrl(Movie movie) {
        return s3PresignedUrlService.resolveTrailerUrl(movie.getTrailerUrl());
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpsertMovieRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;

        @NotNull(message = "Duration is required")
        @Min(value = 1, message = "Duration must be greater than 0")
        private Integer durationMinutes;

        @NotNull(message = "Rating is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Rating must be at least 0")
        @DecimalMax(value = "10.0", inclusive = true, message = "Rating must be at most 10")
        private BigDecimal rating;

        @Builder.Default
        private Boolean active = true;

        private String posterUrl;
        private String trailerUrl;
        private String director;
        private String actors;
        private String genre;
        private LocalDate releaseDate;
        private String language;
        private String rated;
        private String streamProvider;
        private String streamKey;
        private Movie.Status status;
    }
}
