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

    public List<MovieResponse> listMovies() {
        return movieRepository.findAll().stream()
                .map(MovieResponse::fromMovieWithStream)
                .toList();
    }

    public MovieResponse getMovie(UUID movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        return MovieResponse.fromMovieWithStream(movie);
    }

    @Transactional
    public MovieResponse updateMovie(UUID movieId, StaffMovieRequest request) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));

        if (request.getPosterUrl() != null) {
            movie.setPosterUrl(request.getPosterUrl());
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
        return MovieResponse.fromMovieWithStream(saved);
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
