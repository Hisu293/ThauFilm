package com.filmticket.entity;

import com.filmticket.model.ShowtimeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "showtime",
    uniqueConstraints = @UniqueConstraint(columnNames = {"cinema_room_id", "start_time"}),
    indexes = {
        @Index(name = "idx_showtime_movie", columnList = "movie_id"),
        @Index(name = "idx_showtime_cinema_room", columnList = "cinema_room_id"),
        @Index(name = "idx_showtime_start_time", columnList = "start_time"),
        @Index(name = "idx_showtime_status", columnList = "status")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Showtime {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "movie_id", nullable = false)
    private UUID movieId;

    @Column(name = "cinema_room_id", nullable = false)
    private UUID cinemaRoomId;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ShowtimeStatus status = ShowtimeStatus.SCHEDULED;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
