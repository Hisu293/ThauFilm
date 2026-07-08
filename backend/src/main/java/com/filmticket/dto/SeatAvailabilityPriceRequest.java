package com.filmticket.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatAvailabilityPriceRequest {
    @NotNull(message = "Showtime id is required")
    private java.util.UUID showtimeId;

    @NotEmpty(message = "Price map is required")
    private Map<java.util.UUID, BigDecimal> prices;
}
