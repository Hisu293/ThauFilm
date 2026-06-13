package com.filmticket.dto;

import com.filmticket.entity.Movie;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieResponse {
    private UUID id;
    private String title;
    private String description;
    private Integer durationMinutes;
    private BigDecimal rating;
    private boolean active;
    private String posterUrl;
    private String director;
    private String actors;
    private String genre;
    private LocalDate releaseDate;
    private String language;
    private String rated;
    private Movie.Status status;

    public static MovieResponse fromMovie(Movie movie) {
        return MovieResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .durationMinutes(movie.getDurationMinutes())
                .rating(movie.getRating())
                .active(movie.isActive())
                .posterUrl(movie.getPosterUrl())
                .director(movie.getDirector())
                .actors(movie.getActors())
                .genre(movie.getGenre())
                .releaseDate(movie.getReleaseDate())
                .language(movie.getLanguage())
                .rated(movie.getRated())
                .status(movie.getStatus())
                .build();
    }
}
