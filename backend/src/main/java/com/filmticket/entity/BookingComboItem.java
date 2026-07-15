package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "booking_combo_items", uniqueConstraints = @UniqueConstraint(columnNames = {"booking_id", "combo_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BookingComboItem {
    @Id private UUID id;
    @Column(name = "booking_id", nullable = false) private UUID bookingId;
    @Column(name = "combo_id", nullable = false) private UUID comboId;
    @Column(nullable = false) private int quantity;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void create() { if (id == null) id = UUID.randomUUID(); if (createdAt == null) createdAt = LocalDateTime.now(); }
}
