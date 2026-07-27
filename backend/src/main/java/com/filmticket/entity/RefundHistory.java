package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refund_histories", indexes = {
        @Index(name = "idx_refund_history_booking", columnList = "booking_id"),
        @Index(name = "idx_refund_history_payment", columnList = "payment_id"),
        @Index(name = "idx_refund_history_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundHistory {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "payment_id", nullable = false)
    private UUID paymentId;

    @Column(name = "refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refund_reason", nullable = false, columnDefinition = "TEXT")
    private String refundReason;

    @Column(name = "payos_refund_id", length = 120)
    private String payosRefundId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundHistoryStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "response_json", columnDefinition = "TEXT")
    private String responseJson;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
