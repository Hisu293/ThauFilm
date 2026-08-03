package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "discount_usages", indexes = {
        @Index(name = "idx_discount_usage_discount", columnList = "discount_id"),
        @Index(name = "idx_discount_usage_user", columnList = "user_id")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscountUsage {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "discount_id", nullable = false)
    private UUID discountId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime usedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
            usedAt = LocalDateTime.now();
        }
    }
}
