package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payroll_records", uniqueConstraints = @UniqueConstraint(name = "uk_payroll_staff_month", columnNames = {"staff_id", "payroll_month"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PayrollRecord {
    @Id private UUID id;
    @Column(name = "staff_id", nullable = false) private UUID staffId;
    @Column(name = "payroll_month", nullable = false) private LocalDate payrollMonth;
    @Enumerated(EnumType.STRING) @Column(name = "employment_type", nullable = false, length = 20) private EmploymentType employmentType;
    @Column(name = "regular_minutes", nullable = false) private long regularMinutes;
    @Column(name = "overtime_minutes", nullable = false) private long overtimeMinutes;
    @Column(name = "base_salary", nullable = false, precision = 14, scale = 2) private BigDecimal baseSalary;
    @Column(name = "overtime_pay", nullable = false, precision = 14, scale = 2) private BigDecimal overtimePay;
    @Column(nullable = false, precision = 14, scale = 2) private BigDecimal allowance;
    @Column(nullable = false, precision = 14, scale = 2) private BigDecimal bonus;
    @Column(nullable = false, precision = 14, scale = 2) private BigDecimal deduction;
    @Column(name = "total_salary", nullable = false, precision = 14, scale = 2) private BigDecimal totalSalary;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private PayrollStatus status = PayrollStatus.DRAFT;
    @Column(length = 500) private String note;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }
}
