package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "booking_seats", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"booking_id", "seat_id"}),
    indexes = {
        @Index(name = "idx_booking_seat_booking", columnList = "booking_id"),
        @Index(name = "idx_booking_seat_seat", columnList = "seat_id")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSeat {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "seat_id", nullable = false)
    private UUID seatId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal priceAtBooking;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
