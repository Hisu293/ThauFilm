package com.filmticket.service;

import com.filmticket.dto.MovieResponse;
import com.filmticket.dto.StaffMovieRequest;
import com.filmticket.entity.Movie;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffMovieService {

    private final MovieRepository movieRepository;
    private final S3PresignedUrlService s3PresignedUrlService;
    private final ShowtimeDurationSyncService showtimeDurationSyncService;

    public List<MovieResponse> listMovies() {
        return movieRepository.findAll().stream()
                .map(movie -> MovieResponse.fromMovieWithStream(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie)))
                .toList();
    }

    public MovieResponse getMovie(UUID movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));

        return MovieResponse.fromMovieWithStream(movie, resolvePosterUrl(movie), resolveTrailerUrl(movie));
    }

    @Transactional
    public MovieResponse updateMovie(UUID movieId, StaffMovieRequest request) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));

        if (request.getDurationMinutes() != null) {
            showtimeDurationSyncService.syncFutureShowtimes(movieId, movie.getDurationMinutes(),
                    request.getDurationMinutes(), Boolean.TRUE.equals(request.getUpdateFutureShowtimes()));
        }

        if (request.getPosterUrl() != null) {
            movie.setPosterUrl(request.getPosterUrl());
        }
        if (request.getTrailerUrl() != null) {
            movie.setTrailerUrl(normalizeNullable(request.getTrailerUrl()));
        }
        if (request.getDescription() != null) {
            movie.setDescription(request.getDescription());
        }
        if (request.getDirector() != null) {
            movie.setDirector(request.getDirector());
        }
        if (request.getGenre() != null) {
            movie.setGenre(request.getGenre());
        }
        if (request.getDurationMinutes() != null) {
            movie.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getRating() != null) {
            movie.setRating(request.getRating());
        }
        if (request.getReleaseDate() != null) {
            movie.setReleaseDate(request.getReleaseDate());
        }
        if (request.getStreamProvider() != null) {
            movie.setStreamProvider(normalizeNullable(request.getStreamProvider()));
        }
        if (request.getStreamKey() != null) {
            movie.setStreamKey(normalizeNullable(request.getStreamKey()));
        }

        Movie saved = movieRepository.save(movie);
        return MovieResponse.fromMovieWithStream(saved, resolvePosterUrl(saved), resolveTrailerUrl(saved));
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String resolvePosterUrl(Movie movie) {
        return s3PresignedUrlService.resolvePosterUrl(movie.getPosterUrl());
    }

    private String resolveTrailerUrl(Movie movie) {
        return s3PresignedUrlService.resolveTrailerUrl(movie.getTrailerUrl());
    }
}
