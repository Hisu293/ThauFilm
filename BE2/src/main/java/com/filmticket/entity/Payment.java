package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_booking", columnList = "booking_id"),
    @Index(name = "idx_payment_status", columnList = "status"),
    @Index(name = "idx_payment_transaction", columnList = "transaction_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 50)
    private String paymentMethod;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(unique = true, length = 100)
    private String transactionId;

    @Column(nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;

    private java.time.LocalDateTime paidAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
            createdAt = java.time.LocalDateTime.now();
        }
    }
}
