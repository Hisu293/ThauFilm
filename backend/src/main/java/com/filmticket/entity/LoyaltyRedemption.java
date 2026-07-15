package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loyalty_redemptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyRedemption {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "reward_id", nullable = false) private UUID rewardId;
    @Column(name = "discount_id", nullable = false, unique = true) private UUID discountId;
    @Column(name = "redemption_code", nullable = false, unique = true, length = 50) private String redemptionCode;
    @Column(name = "points_spent", nullable = false) private int pointsSpent;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "redeemed_at", nullable = false, updatable = false) private LocalDateTime redeemedAt;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "used_at") private LocalDateTime usedAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (redeemedAt == null) redeemedAt = LocalDateTime.now();
        if (status == null) status = "AVAILABLE";
    }
}
