package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_bookings", indexes = {
        @Index(name = "idx_group_booking_showtime", columnList = "showtime_id"),
        @Index(name = "idx_group_booking_selector", columnList = "selector_id"),
        @Index(name = "idx_group_booking_status_expiry", columnList = "status,expires_at")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class GroupBooking {
    @Id private UUID id;
    @Column(name = "invitation_id", nullable = false, unique = true) private UUID invitationId;
    @Column(name = "showtime_id", nullable = false) private UUID showtimeId;
    @Column(name = "selector_id") private UUID selectorId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    @Builder.Default private GroupBookingStatus status = GroupBookingStatus.WAITING_SELECTION;
    @Column(name = "expires_at") private LocalDateTime expiresAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "confirmed_at") private LocalDateTime confirmedAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
