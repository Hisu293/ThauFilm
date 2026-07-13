package com.filmticket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "online_movie_views", indexes = {
        @Index(name = "idx_online_view_user", columnList = "user_id"),
        @Index(name = "idx_online_view_movie", columnList = "movie_id"),
        @Index(name = "idx_online_view_showtime", columnList = "showtime_id"),
        @Index(name = "idx_online_view_booking", columnList = "booking_id"),
        @Index(name = "idx_online_view_viewed_at", columnList = "viewed_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineMovieView {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "movie_id", nullable = false)
    private UUID movieId;

    @Column(name = "showtime_id")
    private UUID showtimeId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (viewedAt == null) viewedAt = LocalDateTime.now();
    }
}
