package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "movie_matching_actions", uniqueConstraints = @UniqueConstraint(columnNames = {"actor_id", "target_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchingAction {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "actor_id", nullable = false, updatable = false)
    private UUID actorId;

    @Column(name = "target_id", nullable = false, updatable = false)
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Decision decision;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() { if (id == null) id = UUID.randomUUID(); }

    public enum Decision { LIKE, PASS }
}
