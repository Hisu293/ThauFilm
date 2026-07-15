package com.filmticket.repository;

import com.filmticket.entity.PayrollRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, UUID> {
    Optional<PayrollRecord> findByStaffIdAndPayrollMonth(UUID staffId, LocalDate payrollMonth);
    List<PayrollRecord> findByPayrollMonthOrderByTotalSalaryDesc(LocalDate payrollMonth);
}
