package com.filmticket.service;

import com.filmticket.dto.StaffAttendanceResponse;
import com.filmticket.entity.StaffAttendance;
import com.filmticket.entity.StaffShiftAssignment;
import com.filmticket.entity.User;
import com.filmticket.entity.WorkShiftType;
import com.filmticket.repository.StaffAttendanceRepository;
import com.filmticket.repository.StaffShiftAssignmentRepository;
import com.filmticket.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StaffAttendanceServiceTest {

    @Test
    void checkInAndCheckOutCompleteTheCurrentStaffShift() {
        UUID staffId = UUID.randomUUID();
        User staff = User.builder()
                .id(staffId)
                .fullName("Nhân viên kiểm thử")
                .email("staff@example.com")
                .role(User.Role.STAFF)
                .build();
        UserRepository userRepository = mock(UserRepository.class);
        StaffAttendanceRepository attendanceRepository = mock(StaffAttendanceRepository.class);
        StaffShiftAssignmentRepository shiftRepository = mock(StaffShiftAssignmentRepository.class);
        AtomicReference<StaffAttendance> stored = new AtomicReference<>();
        StaffShiftAssignment shift = StaffShiftAssignment.builder()
                .id(UUID.randomUUID()).staffId(staffId).workDate(LocalDate.now()).shiftType(WorkShiftType.MORNING)
                .scheduledStart(LocalDate.now().atTime(7, 30)).scheduledEnd(LocalDate.now().atTime(12, 0)).build();

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(attendanceRepository.findByStaffIdAndWorkDate(staffId, LocalDate.now()))
                .thenAnswer(ignored -> Optional.ofNullable(stored.get()));
        when(attendanceRepository.findFirstByStaffIdAndCheckOutAtIsNullOrderByCheckInAtDesc(staffId))
                .thenAnswer(ignored -> Optional.ofNullable(stored.get()).filter(item -> item.getCheckOutAt() == null));
        when(shiftRepository.findByStaffIdAndWorkDate(staffId, LocalDate.now())).thenReturn(Optional.of(shift));
        when(shiftRepository.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(attendanceRepository.save(any(StaffAttendance.class))).thenAnswer(invocation -> {
            StaffAttendance attendance = invocation.getArgument(0);
            if (attendance.getId() == null) attendance.setId(UUID.randomUUID());
            stored.set(attendance);
            return attendance;
        });

        StaffAttendanceService service = new StaffAttendanceService(attendanceRepository, userRepository, shiftRepository);

        StaffAttendanceResponse checkedIn = service.checkIn(staffId);
        assertEquals("WORKING", checkedIn.getStatus());
        assertNotNull(checkedIn.getCheckInAt());
        assertNull(checkedIn.getCheckOutAt());

        StaffAttendanceResponse checkedOut = service.checkOut(staffId);
        assertEquals("COMPLETED", checkedOut.getStatus());
        assertNotNull(checkedOut.getCheckOutAt());
    }
}
