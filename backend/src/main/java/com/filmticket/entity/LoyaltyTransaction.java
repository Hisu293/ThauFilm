package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loyalty_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTransaction {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "booking_id") private UUID bookingId;
    @Column(name = "redemption_id") private UUID redemptionId;
    @Column(name = "transaction_type", nullable = false, length = 20) private String transactionType;
    @Column(nullable = false) private int points;
    @Column(name = "balance_after", nullable = false) private int balanceAfter;
    @Column(nullable = false, length = 255) private String description;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
