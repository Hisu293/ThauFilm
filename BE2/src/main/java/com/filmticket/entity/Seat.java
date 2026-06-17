package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "seat",
    uniqueConstraints = @UniqueConstraint(columnNames = {"cinema_room_id", "row_name", "seat_number"}),
    indexes = {
        @Index(name = "idx_seat_cinema_room", columnList = "cinema_room_id"),
        @Index(name = "idx_seat_type", columnList = "type")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    public enum Type {
        VIP, STANDARD, COUPLE;

        public static Type fromStorageValue(String value) {
            if (value == null) return STANDARD;
            String normalized = value.trim().toUpperCase();
            return switch (normalized) {
                case "VIP" -> VIP;
                case "COUPLE" -> COUPLE;
                default -> STANDARD;
            };
        }

        public String toStorageValue() {
            return switch (this) {
                case VIP -> "VIP";
                case STANDARD -> "STANDARD";
                case COUPLE -> "COUPLE";
            };
        }

        public String toDisplayValue() {
            return switch (this) {
                case VIP -> "VIP";
                case STANDARD -> "Thường";
                case COUPLE -> "Đôi";
            };
        }
    }

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "cinema_room_id", nullable = false)
    private UUID cinemaRoomId;

    @Column(name = "row_name", nullable = false)
    private String rowName;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Type type = Type.STANDARD;

    @Column(nullable = false)
    @Builder.Default
    private Integer status = 1;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
