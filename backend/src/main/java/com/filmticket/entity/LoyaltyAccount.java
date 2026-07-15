package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "loyalty_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyAccount {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false, unique = true) private UUID userId;
    @Column(name = "points_balance", nullable = false) @Builder.Default private int pointsBalance = 0;
    @Column(name = "lifetime_earned", nullable = false) @Builder.Default private int lifetimeEarned = 0;
    @Column(name = "lifetime_redeemed", nullable = false) @Builder.Default private int lifetimeRedeemed = 0;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
}
