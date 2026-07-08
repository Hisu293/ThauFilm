package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_booking_members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_group_booking_member", columnNames = {"group_booking_id", "user_id"}),
        @UniqueConstraint(name = "uk_group_booking_seat", columnNames = {"group_booking_id", "seat_id"})
}, indexes = {
        @Index(name = "idx_group_member_group", columnList = "group_booking_id"),
        @Index(name = "idx_group_member_user", columnList = "user_id"),
        @Index(name = "idx_group_member_seat", columnList = "seat_id"),
        @Index(name = "idx_group_member_booking", columnList = "booking_id")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class GroupBookingMember {
    @Id private UUID id;
    @Column(name = "group_booking_id", nullable = false) private UUID groupBookingId;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "seat_id") private UUID seatId;
    @Column(name = "booking_id", unique = true) private UUID bookingId;
    @Column(precision = 10, scale = 2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(name = "payment_status", nullable = false, length = 20)
    @Builder.Default private GroupMemberPaymentStatus paymentStatus = GroupMemberPaymentStatus.PENDING;
    @Column(name = "paid_at") private LocalDateTime paidAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
