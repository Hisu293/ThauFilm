package com.filmticket.repository;

import com.filmticket.entity.StaffShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffShiftAssignmentRepository extends JpaRepository<StaffShiftAssignment, UUID> {
    Optional<StaffShiftAssignment> findByStaffIdAndWorkDate(UUID staffId, LocalDate workDate);
    List<StaffShiftAssignment> findByWorkDateBetweenOrderByWorkDateAscScheduledStartAsc(LocalDate from, LocalDate to);
    List<StaffShiftAssignment> findByStaffIdAndWorkDateBetweenOrderByWorkDateAsc(UUID staffId, LocalDate from, LocalDate to);
}
