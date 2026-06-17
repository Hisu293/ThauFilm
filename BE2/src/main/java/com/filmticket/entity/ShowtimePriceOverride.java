package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "showtime_price_overrides",
    uniqueConstraints = @UniqueConstraint(columnNames = {"showtime_id", "seat_type"}),
    indexes = {
        @Index(name = "idx_showtime_price_showtime", columnList = "showtime_id")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowtimePriceOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "showtime_id", nullable = false)
    private UUID showtimeId;

    @Column(nullable = false, length = 30)
    private String seatType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
}
