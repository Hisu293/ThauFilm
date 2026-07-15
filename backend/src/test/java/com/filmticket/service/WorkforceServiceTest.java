package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.repository.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WorkforceServiceTest {

    @Test
    void lateShiftEndsOnTheFollowingDay() {
        UUID staffId = UUID.randomUUID();
        UserRepository users = mock(UserRepository.class);
        StaffShiftAssignmentRepository shifts = mock(StaffShiftAssignmentRepository.class);
        User staff = User.builder().id(staffId).role(User.Role.STAFF).fullName("Nhân viên").build();
        when(users.findById(staffId)).thenReturn(Optional.of(staff));
        when(shifts.findByStaffIdAndWorkDate(any(), any())).thenReturn(Optional.empty());
        when(shifts.save(any())).thenAnswer(invocation -> {
            StaffShiftAssignment assignment = invocation.getArgument(0);
            assignment.setId(UUID.randomUUID());
            return assignment;
        });
        WorkforceService service = service(users, shifts, mock(StaffEmploymentProfileRepository.class),
                mock(StaffAttendanceRepository.class), mock(PayrollRecordRepository.class));
        LocalDate workDate = LocalDate.of(2026, 7, 15);

        Map<String, Object> result = service.assignShift(staffId, workDate, WorkShiftType.LATE, null);

        assertEquals(workDate.atTime(22, 0), result.get("scheduledStart"));
        assertEquals(workDate.plusDays(1).atTime(1, 0), result.get("scheduledEnd"));
    }

    @Test
    void calculatesPartTimeFromActualHoursAndFullTimeFromMonthlySalaryAndOvertime() {
        LocalDate month = LocalDate.of(2026, 7, 1);
        LocalDate workDate = month.plusDays(9);
        User partTime = staff("Part-time");
        User fullTime = staff("Full-time");
        UserRepository users = mock(UserRepository.class);
        StaffEmploymentProfileRepository profiles = mock(StaffEmploymentProfileRepository.class);
        StaffShiftAssignmentRepository shifts = mock(StaffShiftAssignmentRepository.class);
        StaffAttendanceRepository attendance = mock(StaffAttendanceRepository.class);
        PayrollRecordRepository payroll = mock(PayrollRecordRepository.class);
        StaffEmploymentProfile partProfile = StaffEmploymentProfile.builder().staffId(partTime.getId())
                .employmentType(EmploymentType.PART_TIME).hourlyRate(BigDecimal.valueOf(25000)).build();
        StaffEmploymentProfile fullProfile = StaffEmploymentProfile.builder().staffId(fullTime.getId())
                .employmentType(EmploymentType.FULL_TIME).monthlySalary(BigDecimal.valueOf(10_000_000))
                .overtimeHourlyRate(BigDecimal.valueOf(50_000)).defaultAllowance(BigDecimal.valueOf(500_000)).build();
        StaffShiftAssignment partShift = shift(partTime.getId(), workDate, WorkShiftType.AFTERNOON, 12, 17);
        StaffShiftAssignment fullShift = shift(fullTime.getId(), workDate, WorkShiftType.EVENING, 17, 22);
        StaffAttendance partAttendance = attendance(partTime.getId(), partShift, 12, 16);
        StaffAttendance fullAttendance = attendance(fullTime.getId(), fullShift, 17, 23);

        when(users.findAll()).thenReturn(List.of(partTime, fullTime));
        when(profiles.findAll()).thenReturn(List.of(partProfile, fullProfile));
        when(shifts.findByWorkDateBetweenOrderByWorkDateAscScheduledStartAsc(any(), any()))
                .thenReturn(List.of(partShift, fullShift));
        when(attendance.findByStaffIdInAndWorkDateBetween(anyList(), any(), any()))
                .thenReturn(List.of(partAttendance, fullAttendance));
        when(payroll.findByStaffIdAndPayrollMonth(any(), any())).thenReturn(Optional.empty());
        when(payroll.save(any())).thenAnswer(invocation -> {
            PayrollRecord record = invocation.getArgument(0);
            record.setId(UUID.randomUUID());
            return record;
        });

        Map<String, Object> result = service(users, shifts, profiles, attendance, payroll).monthlyPayroll(2026, 7);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("records");
        Map<UUID, Map<String, Object>> byStaff = Map.of(
                (UUID) rows.get(0).get("staffId"), rows.get(0),
                (UUID) rows.get(1).get("staffId"), rows.get(1));

        assertEquals(BigDecimal.valueOf(100_000), byStaff.get(partTime.getId()).get("totalSalary"));
        assertEquals(360L, byStaff.get(fullTime.getId()).get("regularMinutes"));
        assertEquals(60L, byStaff.get(fullTime.getId()).get("overtimeMinutes"));
        assertEquals(BigDecimal.valueOf(10_550_000), byStaff.get(fullTime.getId()).get("totalSalary"));
    }

    private WorkforceService service(UserRepository users, StaffShiftAssignmentRepository shifts,
                                     StaffEmploymentProfileRepository profiles, StaffAttendanceRepository attendance,
                                     PayrollRecordRepository payroll) {
        return new WorkforceService(users, profiles, shifts, attendance, payroll, mock(AttendanceAccessCodeService.class));
    }

    private User staff(String name) {
        return User.builder().id(UUID.randomUUID()).role(User.Role.STAFF).fullName(name).email(name + "@example.com").build();
    }

    private StaffShiftAssignment shift(UUID staffId, LocalDate date, WorkShiftType type, int startHour, int endHour) {
        return StaffShiftAssignment.builder().id(UUID.randomUUID()).staffId(staffId).workDate(date).shiftType(type)
                .scheduledStart(date.atTime(startHour, 0)).scheduledEnd(date.atTime(endHour, 0)).build();
    }

    private StaffAttendance attendance(UUID staffId, StaffShiftAssignment shift, int startHour, int endHour) {
        return StaffAttendance.builder().id(UUID.randomUUID()).staffId(staffId).workDate(shift.getWorkDate())
                .shiftAssignmentId(shift.getId()).checkInAt(shift.getWorkDate().atTime(startHour, 0))
                .checkOutAt(shift.getWorkDate().atTime(endHour, 0)).build();
    }
}
