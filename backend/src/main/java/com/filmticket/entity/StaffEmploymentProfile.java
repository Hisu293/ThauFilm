package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_employment_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class StaffEmploymentProfile {
    @Id
    @Column(name = "staff_id")
    private UUID staffId;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 20)
    @Builder.Default
    private EmploymentType employmentType = EmploymentType.PART_TIME;

    @Column(name = "hourly_rate", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal hourlyRate = BigDecimal.valueOf(25000);

    @Column(name = "monthly_salary", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal monthlySalary = BigDecimal.ZERO;

    @Column(name = "overtime_hourly_rate", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal overtimeHourlyRate = BigDecimal.ZERO;

    @Column(name = "default_allowance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal defaultAllowance = BigDecimal.ZERO;

    @Column(name = "shift_leader", nullable = false)
    @Builder.Default
    private boolean shiftLeader = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }
}
