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
public class SeatTypePriceConfigResponse {
    private UUID id;
    private String seatType;
    private BigDecimal price;
    private boolean active;
}
