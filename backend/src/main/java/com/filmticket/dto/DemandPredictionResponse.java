package com.filmticket.dto;

import com.filmticket.model.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemandPredictionResponse {
    private LocalDate date;
    private int occupancyPercent;
    private int predictedSeats;
    private int totalSeats;
    private int showtimeCount;
    private int historicalSampleSize;
    private String confidence;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShowtimeSuggestion {
        private UUID movieId;
        private UUID cinemaRoomId;
        private String roomName;
        private RoomType roomType;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private int predictedOccupancyPercent;
        private String reason;
    }
}
