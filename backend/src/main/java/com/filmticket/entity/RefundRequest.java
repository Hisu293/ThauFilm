package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refund_requests", indexes = {
        @Index(name = "idx_refund_booking", columnList = "booking_id"),
        @Index(name = "idx_refund_customer", columnList = "customer_id, created_at"),
        @Index(name = "idx_refund_status", columnList = "status, created_at"),
        @Index(name = "idx_refund_staff", columnList = "staff_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefundRequest {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "payment_id", nullable = false)
    private UUID paymentId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "staff_id")
    private UUID staffId;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "ticket_code", nullable = false, length = 20)
    private String ticketCode;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RefundRequestStatus status;

    @Column(name = "requires_admin", nullable = false)
    private boolean requiresAdmin;

    @Column(name = "ticket_checked_in", nullable = false)
    private boolean ticketCheckedIn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Version
    private long version;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = updatedAt = LocalDateTime.now();
        if (status == null) status = RefundRequestStatus.REQUESTED;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }
}
