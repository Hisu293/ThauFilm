package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "movie_matching_blocks", uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchingBlock {
    @Id private UUID id;
    @Column(name = "blocker_id", nullable = false, updatable = false) private UUID blockerId;
    @Column(name = "blocked_id", nullable = false, updatable = false) private UUID blockedId;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
}
