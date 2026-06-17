package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_ticket_booking", columnList = "booking_id"),
    @Index(name = "idx_ticket_seat", columnList = "seat_id"),
    @Index(name = "idx_ticket_code", columnList = "ticket_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(nullable = false)
    private UUID seatId;

    @Column(unique = true, nullable = false, length = 20)
    private String ticketCode;

    @Column(nullable = false)
    @Builder.Default
    private boolean checkedIn = false;

    @Column(nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
            createdAt = java.time.LocalDateTime.now();
        }
    }
}
