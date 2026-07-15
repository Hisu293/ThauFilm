package com.filmticket.repository;

import com.filmticket.entity.AttendanceAccessCode;
import com.filmticket.entity.WorkShiftType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceAccessCodeRepository extends JpaRepository<AttendanceAccessCode, UUID> {
    Optional<AttendanceAccessCode> findByQrToken(UUID qrToken);
    List<AttendanceAccessCode> findByPinCodeAndActiveTrueOrderByCreatedAtDesc(String pinCode);
    List<AttendanceAccessCode> findByWorkDateAndShiftTypeOrderByCreatedAtDesc(LocalDate workDate, WorkShiftType shiftType);
}
