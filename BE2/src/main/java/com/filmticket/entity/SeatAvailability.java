package com.filmticket.entity;

import com.filmticket.model.SeatBookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "seat_availabilities",
    uniqueConstraints = @UniqueConstraint(columnNames = {"showtime_id", "seat_id"}),
    indexes = {
        @Index(name = "idx_seat_avail_showtime", columnList = "showtime_id"),
        @Index(name = "idx_seat_avail_seat", columnList = "seat_id"),
        @Index(name = "idx_seat_avail_available", columnList = "available")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatAvailability {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "showtime_id", nullable = false)
    private UUID showtimeId;

    @Column(name = "seat_id", nullable = false)
    private UUID seatId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SeatBookingStatus status = SeatBookingStatus.AVAILABLE;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
