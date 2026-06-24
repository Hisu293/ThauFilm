package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "movie_match_messages")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchMessage {
    @Id private UUID id;
    @Column(name = "match_id", nullable = false, updatable = false) private UUID matchId;
    @Column(name = "sender_id", nullable = false, updatable = false) private UUID senderId;
    @Column(nullable = false, length = 1000) private String content;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
}
