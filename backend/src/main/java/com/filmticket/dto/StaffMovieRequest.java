package com.filmticket.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffMovieRequest {

    @Size(max = 255, message = "Poster url is too long")
    private String posterUrl;

    @Size(max = 1000, message = "Trailer url is too long")
    private String trailerUrl;

    @Size(max = 5000, message = "Description is too long")
    private String description;

    @Size(max = 255, message = "Director is too long")
    private String director;

    @Size(max = 100, message = "Genre is too long")
    private String genre;

    @Size(max = 50, message = "Stream provider is too long")
    private String streamProvider;

    @Size(max = 1000, message = "Stream key is too long")
    private String streamKey;

    @Min(value = 1, message = "Duration must be greater than 0")
    private Integer durationMinutes;

    private Boolean updateFutureShowtimes;

    @DecimalMin(value = "0.0", inclusive = true, message = "Rating must be at least 0")
    @DecimalMax(value = "10.0", inclusive = true, message = "Rating must be at most 10")
    private BigDecimal rating;

    private LocalDate releaseDate;
}
