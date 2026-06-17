package com.filmticket.dto;

import com.filmticket.entity.Showtime;
import com.filmticket.model.ShowtimeStatus;
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
    private UUID theaterId;
    private String theaterName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private ShowtimeStatus status;

    public static ShowtimeResponse fromShowtime(Showtime showtime) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovieId())
                .cinemaRoomId(showtime.getCinemaRoomId())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .status(showtime.getStatus())
                .build();
    }

    public static ShowtimeResponse fromShowtimeContext(Showtime showtime, String movieTitle, String cinemaRoomName, UUID theaterId, String theaterName) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovieId())
                .movieTitle(movieTitle)
                .cinemaRoomId(showtime.getCinemaRoomId())
                .cinemaRoomName(cinemaRoomName)
                .theaterId(theaterId)
                .theaterName(theaterName)
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .status(showtime.getStatus())
                .build();
    }
}
