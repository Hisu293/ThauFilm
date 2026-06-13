package com.filmticket.dto;

import com.filmticket.entity.SeatAvailability;
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
public class ShowtimeSeatResponse {
    private UUID seatId;
    private String rowName;
    private Integer seatNumber;
    private String type;
    private boolean available;
    private BigDecimal price;

    public static ShowtimeSeatResponse fromSeatAvailability(SeatAvailability availability) {
        return ShowtimeSeatResponse.builder()
                .seatId(availability.getSeat().getId())
                .rowName(availability.getSeat().getRowName())
                .seatNumber(availability.getSeat().getSeatNumber())
                .type(availability.getSeat().getType())
                .available(availability.isAvailable())
                .price(availability.getPrice())
                .build();
    }
}
