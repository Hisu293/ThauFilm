package com.filmticket.dto;

import com.filmticket.entity.Seat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatResponse {
    private UUID id;
    private UUID cinemaRoomId;
    private String rowName;
    private Integer seatNumber;
    private String type;
    private Integer status;

    public static SeatResponse fromSeat(Seat seat) {
        return SeatResponse.builder()
                .id(seat.getId())
                .cinemaRoomId(seat.getCinemaRoom().getId())
                .rowName(seat.getRowName())
                .seatNumber(seat.getSeatNumber())
                .type(seat.getType().toStorageValue())
                .status(seat.getStatus())
                .build();
    }
}
