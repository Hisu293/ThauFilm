package com.filmticket.repository;

import com.filmticket.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, UUID> {
    Optional<StaffAttendance> findByStaffIdAndWorkDate(UUID staffId, LocalDate workDate);

    List<StaffAttendance> findByStaffIdAndWorkDateBetweenOrderByWorkDateDesc(
            UUID staffId,
            LocalDate from,
            LocalDate to
    );

    List<StaffAttendance> findByWorkDateBetweenOrderByWorkDateDescCheckInAtDesc(LocalDate from, LocalDate to);
}
