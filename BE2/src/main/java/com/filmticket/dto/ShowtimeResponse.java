package com.filmticket.dto;

import com.filmticket.entity.Showtime;
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
public class ShowtimeResponse {
    private UUID id;
    private UUID movieId;
    private String movieTitle;
    private UUID cinemaRoomId;
    private String cinemaRoomName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer status;

    public static ShowtimeResponse fromShowtime(Showtime showtime) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovie().getId())
                .movieTitle(showtime.getMovie().getTitle())
                .cinemaRoomId(showtime.getCinemaRoom().getId())
                .cinemaRoomName(showtime.getCinemaRoom().getName())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .status(showtime.getStatus())
                .build();
    }
}
