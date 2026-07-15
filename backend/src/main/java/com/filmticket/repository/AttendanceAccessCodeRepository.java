package com.filmticket.repository;

import com.filmticket.entity.AttendanceAccessCode;
import com.filmticket.entity.WorkShiftType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceAccessCodeRepository extends JpaRepository<AttendanceAccessCode, UUID> {
    Optional<AttendanceAccessCode> findByQrToken(UUID qrToken);
    List<AttendanceAccessCode> findByPinCodeAndActiveTrueOrderByCreatedAtDesc(String pinCode);
    List<AttendanceAccessCode> findByWorkDateAndShiftTypeOrderByCreatedAtDesc(LocalDate workDate, WorkShiftType shiftType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM AttendanceAccessCode c WHERE c.workDate = :workDate AND c.shiftType = :shiftType AND c.active = true ORDER BY c.createdAt DESC")
    List<AttendanceAccessCode> findActiveForUpdate(@Param("workDate") LocalDate workDate,
                                                    @Param("shiftType") WorkShiftType shiftType);
}
