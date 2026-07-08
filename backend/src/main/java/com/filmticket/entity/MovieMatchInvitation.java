package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "movie_match_invitations")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchInvitation {
    @Id private UUID id;
    @Column(name = "match_id", nullable = false, updatable = false) private UUID matchId;
    @Column(name = "sender_id", nullable = false, updatable = false) private UUID senderId;
    @Column(name = "recipient_id", nullable = false, updatable = false) private UUID recipientId;
    @Column(name = "showtime_id", nullable = false, updatable = false) private UUID showtimeId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private Status status = Status.PENDING;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "responded_at") private LocalDateTime respondedAt;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
    public enum Status { PENDING, ACCEPTED, DECLINED, CANCELLED }
}
