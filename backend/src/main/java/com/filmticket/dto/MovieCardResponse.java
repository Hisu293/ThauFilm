package com.filmticket.dto;

import com.filmticket.entity.Movie;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieCardResponse {
    private UUID id;
    private String title;
    private String posterUrl;
    private Movie.Status status;

    public static MovieCardResponse fromMovie(Movie movie) {
        return fromMovie(movie, movie.getPosterUrl());
    }

    public static MovieCardResponse fromMovie(Movie movie, String posterUrl) {
        return MovieCardResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .posterUrl(posterUrl)
                .status(movie.getStatus())
                .build();
    }
}
