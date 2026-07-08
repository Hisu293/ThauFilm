package com.filmticket.dto;

import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatMapResponse {
    private UUID roomId;
    private String roomName;
    private Integer totalRows;
    private Integer seatsPerRow;
    private Integer totalSeats;
    private Integer standardSeatCount;
    private Integer vipSeatCount;
    private Map<String, RowInfo> rows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RowInfo {
        private String rowName;
        private Integer seatCount;
        private String type;
        private Integer availableSeats;
    }
}
