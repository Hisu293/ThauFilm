package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_shift_assignments", uniqueConstraints = @UniqueConstraint(name = "uk_staff_shift_day", columnNames = {"staff_id", "work_date"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StaffShiftAssignment {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift_type", nullable = false, length = 20)
    private WorkShiftType shiftType;

    @Column(name = "scheduled_start", nullable = false)
    private LocalDateTime scheduledStart;

    @Column(name = "scheduled_end", nullable = false)
    private LocalDateTime scheduledEnd;

    @Column(length = 500)
    private String note;

    @Column(length = 255)
    private String workplace;

    @Column(name = "theater_id")
    private UUID theaterId;

    @Column(columnDefinition = "TEXT")
    private String tasks;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_source", nullable = false, length = 20)
    private ShiftAssignmentSource assignmentSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private ShiftApprovalStatus approvalStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        if (assignmentSource == null) assignmentSource = ShiftAssignmentSource.ADMIN;
        if (approvalStatus == null) approvalStatus = ShiftApprovalStatus.APPROVED;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }
}
