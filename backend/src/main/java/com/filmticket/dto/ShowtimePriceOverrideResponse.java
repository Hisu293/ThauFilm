package com.filmticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePriceOverrideResponse {
    private UUID id;
    private UUID showtimeId;
    private String seatType;
    private BigDecimal price;
}
