package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePriceOverrideRequest {
    @NotNull(message = "Showtime id is required")
    private java.util.UUID showtimeId;

    @NotBlank(message = "Seat type is required")
    private String seatType;

    @NotNull(message = "Price is required")
    private BigDecimal price;
}
