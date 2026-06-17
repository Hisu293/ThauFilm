package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "cinema_room",
    indexes = {
        @Index(name = "idx_cinema_room_theater", columnList = "theater_id"),
        @Index(name = "idx_cinema_room_status", columnList = "status")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoom {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private Integer capacity;

    private Integer status;

    @Column(name = "theater_id")
    private UUID theaterId;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
