package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens", indexes = {
    @Index(name = "idx_refresh_token_user", columnList = "user_id"),
    @Index(name = "idx_refresh_token_expiry", columnList = "expiry_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(unique = true, nullable = false, length = 512)
    private String token;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private Instant expiryDate;

    @Builder.Default
    @Column(nullable = false)
    private boolean revoked = false;

    private Instant createdAt;

    private Instant revokedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(Instant.now());
    }
}
