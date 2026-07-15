package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_access_codes", indexes = {
        @Index(name = "idx_attendance_code_qr_uuid", columnList = "qr_token"),
        @Index(name = "idx_attendance_code_pin_date", columnList = "pin_code,work_date,active")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AttendanceAccessCode {
    @Id private UUID id;
    @Column(name = "work_date", nullable = false) private LocalDate workDate;
    @Enumerated(EnumType.STRING) @Column(name = "shift_type", nullable = false) private WorkShiftType shiftType;
    @Column(name = "qr_token", nullable = false, unique = true) private UUID qrToken;
    @Column(name = "pin_code", nullable = false, length = 6) private String pinCode;
    @Column(name = "valid_from", nullable = false) private LocalDateTime validFrom;
    @Column(name = "valid_until", nullable = false) private LocalDateTime validUntil;
    @Column(nullable = false) private boolean active;
    @Column(name = "created_by", nullable = false) private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @PrePersist void create() { var now = LocalDateTime.now(); if (id == null) id = UUID.randomUUID(); if (qrToken == null) qrToken = UUID.randomUUID(); if (createdAt == null) createdAt = now; updatedAt = now; }
    @PreUpdate void update() { updatedAt = LocalDateTime.now(); }
}
