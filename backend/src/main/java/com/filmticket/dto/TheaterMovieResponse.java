package com.filmticket.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterMovieResponse {
    private UUID theaterId;
    private String theaterName;
    private String address;
    private java.util.List<MovieInfo> movies;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MovieInfo {
        private UUID movieId;
        private String movieTitle;
        private String posterUrl;
        private String genre;
        private java.math.BigDecimal rating;
    }
}
