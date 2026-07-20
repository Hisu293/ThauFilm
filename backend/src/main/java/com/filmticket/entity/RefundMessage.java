package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refund_messages", indexes = {
        @Index(name = "idx_refund_message_request", columnList = "refund_request_id, created_at"),
        @Index(name = "idx_refund_message_sender", columnList = "sender_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefundMessage {
    @Id @Column(nullable = false, updatable = false)
    private UUID id;
    @Column(name = "refund_request_id", nullable = false)
    private UUID refundRequestId;
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;
    @Column(name = "sender_role", nullable = false, length = 20)
    private String senderRole;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(name = "image_url", length = 1000)
    private String imageUrl;
    @Column(name = "image_public_id", length = 500)
    private String imagePublicId;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
