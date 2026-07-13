package com.filmticket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "online_viewing_sessions",
        uniqueConstraints = @UniqueConstraint(name = "uk_online_session_booking", columnNames = "booking_id"),
        indexes = {
                @Index(name = "idx_online_session_user_movie", columnList = "user_id,movie_id"),
                @Index(name = "idx_online_session_heartbeat", columnList = "last_heartbeat_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineViewingSession {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "movie_id", nullable = false)
    private UUID movieId;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "last_heartbeat_at", nullable = false)
    private LocalDateTime lastHeartbeatAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (startedAt == null) startedAt = LocalDateTime.now();
        if (lastHeartbeatAt == null) lastHeartbeatAt = startedAt;
    }
}
