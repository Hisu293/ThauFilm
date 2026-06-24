package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "movie_matches", uniqueConstraints = @UniqueConstraint(columnNames = {"user_one_id", "user_two_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatch {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_one_id", nullable = false, updatable = false)
    private UUID userOneId;

    @Column(name = "user_two_id", nullable = false, updatable = false)
    private UUID userTwoId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "ended_by")
    private UUID endedBy;

    @PrePersist
    void prePersist() { if (id == null) id = UUID.randomUUID(); }

    public enum Status { ACTIVE, CANCELLED, BLOCKED }
}
