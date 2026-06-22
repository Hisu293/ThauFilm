package com.filmticket.dto;

import com.filmticket.model.ShowtimeStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertShowtimeRequest {
    @NotNull(message = "Movie id is required")
    private UUID movieId;

    @NotNull(message = "Cinema room id is required")
    private UUID cinemaRoomId;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @NotNull(message = "Status is required")
    private ShowtimeStatus status;
}
