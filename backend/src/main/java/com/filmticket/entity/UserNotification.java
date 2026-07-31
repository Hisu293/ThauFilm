package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_notifications", indexes = {
        @Index(name = "idx_user_notification_user_time", columnList = "user_id, created_at"),
        @Index(name = "idx_user_notification_unread", columnList = "user_id, read_at")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserNotification {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "notification_type", nullable = false, length = 80) private String notificationType;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String message;
    @Column(length = 500) private String link;
    @Column(name = "read_at") private LocalDateTime readAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
