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
    private boolean mystery;
    private boolean mysteryUnlocked;
    private LocalDateTime mysteryUnlockAt;
    private String actualMovieTitle;

    public static ShowtimeResponse fromShowtime(Showtime showtime) {
        LocalDateTime unlockAt = showtime.getMysteryUnlockAt() != null ? showtime.getMysteryUnlockAt() : showtime.getStartTime();
        boolean unlocked = !showtime.isMystery() || !LocalDateTime.now().isBefore(unlockAt);
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovieId())
                .cinemaRoomId(showtime.getCinemaRoomId())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .status(showtime.getStatus())
                .mystery(showtime.isMystery())
                .mysteryUnlocked(unlocked)
                .mysteryUnlockAt(unlockAt)
                .build();
    }

    public static ShowtimeResponse fromShowtimeContext(Showtime showtime, String movieTitle, String cinemaRoomName, UUID theaterId, String theaterName) {
        return fromShowtimeContext(showtime, movieTitle, cinemaRoomName, theaterId, theaterName, true);
    }

    public static ShowtimeResponse fromShowtimeContext(Showtime showtime, String movieTitle, String cinemaRoomName, UUID theaterId, String theaterName, boolean revealMystery) {
        boolean mystery = showtime.isMystery();
        LocalDateTime unlockAt = showtime.getMysteryUnlockAt() != null ? showtime.getMysteryUnlockAt() : showtime.getStartTime();
        boolean unlocked = !mystery || revealMystery || !LocalDateTime.now().isBefore(unlockAt);
        String displayTitle = mystery && !unlocked ? "Mystery Movie Night" : movieTitle;
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(unlocked || revealMystery ? showtime.getMovieId() : null)
                .movieTitle(displayTitle)
                .cinemaRoomId(showtime.getCinemaRoomId())
                .cinemaRoomName(cinemaRoomName)
                .theaterId(theaterId)
                .theaterName(theaterName)
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .status(showtime.getStatus())
                .mystery(mystery)
                .mysteryUnlocked(unlocked)
                .mysteryUnlockAt(unlockAt)
                .actualMovieTitle(revealMystery || unlocked ? movieTitle : null)
                .build();
    }
}
