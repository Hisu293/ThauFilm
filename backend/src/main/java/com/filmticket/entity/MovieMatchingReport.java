package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "movie_matching_reports")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchingReport {
    @Id private UUID id;
    @Column(name = "match_id") private UUID matchId;
    @Column(name = "reporter_id", nullable = false, updatable = false) private UUID reporterId;
    @Column(name = "reported_id", nullable = false, updatable = false) private UUID reportedId;
    @Column(nullable = false, length = 100) private String reason;
    @Column(length = 1000) private String details;
    @Builder.Default @Column(nullable = false, length = 20) private String status = "PENDING";
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
}
