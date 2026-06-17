package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "bookings", indexes = {
    @Index(name = "idx_booking_user", columnList = "user_id"),
    @Index(name = "idx_booking_showtime", columnList = "showtime_id"),
    @Index(name = "idx_booking_confirmation", columnList = "confirmation_code"),
    @Index(name = "idx_booking_status", columnList = "status"),
    @Index(name = "idx_booking_hold_expires", columnList = "hold_expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "showtime_id", nullable = false)
    private UUID showtimeId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BookingStatus status = BookingStatus.HOLD;

    @Column(unique = true, length = 20)
    private String confirmationCode;

    @Column(nullable = false)
    private java.time.LocalDateTime holdExpiresAt;

    @Column(nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;

    private java.time.LocalDateTime confirmedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
            createdAt = java.time.LocalDateTime.now();
        }
    }
}
