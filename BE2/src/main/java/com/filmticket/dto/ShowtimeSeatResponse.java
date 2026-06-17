package com.filmticket.dto;

import com.filmticket.entity.SeatAvailability;
import com.filmticket.model.SeatBookingStatus;
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
    private SeatBookingStatus status;
    private BigDecimal price;

    public static ShowtimeSeatResponse fromSeatAvailability(SeatAvailability availability) {
        return ShowtimeSeatResponse.builder()
                .seatId(availability.getSeatId())
                .status(availability.getStatus())
                .price(availability.getPrice())
                .build();
    }
}
