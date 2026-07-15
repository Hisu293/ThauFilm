package com.filmticket.service;

import com.filmticket.dto.StaffAttendanceResponse;
import com.filmticket.dto.UpdateStaffAttendanceRequest;
import com.filmticket.entity.StaffAttendance;
import com.filmticket.entity.StaffShiftAssignment;
import com.filmticket.entity.User;
import com.filmticket.entity.WorkShiftType;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.StaffAttendanceRepository;
import com.filmticket.repository.StaffShiftAssignmentRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffAttendanceService {
    private final StaffAttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final StaffShiftAssignmentRepository shiftRepository;
    private final AttendanceAccessCodeService accessCodeService;

    @Transactional
    public StaffAttendanceResponse checkIn(UUID staffId, String credential) {
        User staff = requireStaff(staffId);
        LocalDateTime now = LocalDateTime.now();
        StaffShiftAssignment assignment = resolveCurrentAssignment(staffId, now);
        if (assignment == null) throw new BadRequestException("Bạn chưa được phân ca làm việc hôm nay");
        LocalDate workDate = assignment.getWorkDate();
        if (attendanceRepository.findByStaffIdAndWorkDate(staffId, workDate).isPresent()) {
            throw new BadRequestException("Bạn đã check-in hôm nay");
        }
        AttendanceAccessCodeService.Validation validation = accessCodeService.validate(credential, assignment, now);
        long lateMinutes = Math.max(0, Duration.between(assignment.getScheduledStart(), now).toMinutes());
        StaffAttendance attendance = StaffAttendance.builder()
                .staffId(staffId)
                .workDate(workDate)
                .checkInAt(now)
                .shiftAssignmentId(assignment.getId())
                .lateMinutes(lateMinutes)
                .checkInMethod(validation.method())
                .build();
        return toResponse(attendanceRepository.save(attendance), staff, now);
    }

    @Transactional
    public StaffAttendanceResponse checkOut(UUID staffId, String credential) {
        User staff = requireStaff(staffId);
        StaffAttendance attendance = attendanceRepository.findFirstByStaffIdAndCheckOutAtIsNullOrderByCheckInAtDesc(staffId)
                .orElseThrow(() -> new BadRequestException("Bạn cần check-in trước khi check-out"));
        if (attendance.getCheckOutAt() != null) {
            throw new BadRequestException("Bạn đã check-out hôm nay");
        }
        LocalDateTime now = LocalDateTime.now();
        StaffShiftAssignment assignment = attendance.getShiftAssignmentId() == null ? null
                : shiftRepository.findById(attendance.getShiftAssignmentId()).orElse(null);
        if (assignment == null) throw new BadRequestException("Không tìm thấy ca làm của lượt chấm công");
        AttendanceAccessCodeService.Validation validation = accessCodeService.validate(credential, assignment, now);
        attendance.setCheckOutAt(now);
        attendance.setEarlyLeaveMinutes(Math.max(0, Duration.between(now, assignment.getScheduledEnd()).toMinutes()));
        attendance.setCheckOutMethod(validation.method());
        return toResponse(attendanceRepository.save(attendance), staff, now);
    }

    @Transactional(readOnly = true)
    public StaffAttendanceResponse today(UUID staffId) {
        User staff = requireStaff(staffId);
        LocalDateTime now = LocalDateTime.now();
        return attendanceRepository.findFirstByStaffIdAndCheckOutAtIsNullOrderByCheckInAtDesc(staffId)
                .or(() -> attendanceRepository.findByStaffIdAndWorkDate(staffId, now.toLocalDate()))
                .or(() -> attendanceRepository.findFirstByStaffIdOrderByCheckInAtDesc(staffId)
                        .filter(item -> item.getCheckOutAt() != null && item.getCheckOutAt().toLocalDate().equals(now.toLocalDate())))
                .map(item -> toResponse(item, staff, now)).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<StaffAttendanceResponse> myHistory(UUID staffId, int year, int month) {
        User staff = requireStaff(staffId);
        YearMonth selected = requireMonth(year, month);
        return attendanceRepository.findByStaffIdAndWorkDateBetweenOrderByWorkDateDesc(
                        staffId,
                        selected.atDay(1),
                        selected.atEndOfMonth()
                ).stream()
                .map(item -> toResponse(item, staff, LocalDateTime.now()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminMonthly(int year, int month) {
        YearMonth selected = requireMonth(year, month);
        Map<UUID, User> staffById = userRepository.findAll().stream()
                .filter(user -> user.getRole() == User.Role.STAFF)
                .collect(Collectors.toMap(User::getId, Function.identity()));
        LocalDateTime now = LocalDateTime.now();
        List<StaffAttendanceResponse> records = attendanceRepository
                .findByWorkDateBetweenOrderByWorkDateDescCheckInAtDesc(selected.atDay(1), selected.atEndOfMonth())
                .stream()
                .filter(item -> staffById.containsKey(item.getStaffId()))
                .map(item -> toResponse(item, staffById.get(item.getStaffId()), now))
                .toList();
        long completed = records.stream().filter(item -> "COMPLETED".equals(item.getStatus())).count();
        long working = records.stream().filter(item -> "WORKING".equals(item.getStatus())).count();
        long totalMinutes = records.stream().mapToLong(StaffAttendanceResponse::getDurationMinutes).sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year", year);
        result.put("month", month);
        result.put("totalStaff", staffById.size());
        result.put("attendanceDays", records.size());
        result.put("completedShifts", completed);
        result.put("activeShifts", working);
        result.put("totalHours", BigDecimal.valueOf(totalMinutes).divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP));
        result.put("records", records);
        return result;
    }

    @Transactional
    public StaffAttendanceResponse adminUpdate(UUID attendanceId, UpdateStaffAttendanceRequest request) {
        StaffAttendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bản chấm công"));
        User staff = requireStaff(attendance.getStaffId());
        LocalDateTime checkIn = request.getCheckInAt() == null ? attendance.getCheckInAt() : request.getCheckInAt();
        LocalDateTime checkOut = request.getCheckOutAt();
        if (checkOut != null && checkOut.isBefore(checkIn)) {
            throw new BadRequestException("Giờ check-out không được trước giờ check-in");
        }
        attendance.setWorkDate(checkIn.toLocalDate());
        attendance.setCheckInAt(checkIn);
        attendance.setCheckOutAt(checkOut);
        attendance.setNote(request.getNote() == null ? attendance.getNote() : request.getNote().trim());
        return toResponse(attendanceRepository.save(attendance), staff, LocalDateTime.now());
    }

    private User requireStaff(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên"));
        if (staff.getRole() != User.Role.STAFF) {
            throw new BadRequestException("Tài khoản không có quyền nhân viên");
        }
        return staff;
    }

    private YearMonth requireMonth(int year, int month) {
        try {
            return YearMonth.of(year, month);
        } catch (RuntimeException exception) {
            throw new BadRequestException("Tháng chấm công không hợp lệ");
        }
    }

    private StaffAttendanceResponse toResponse(StaffAttendance attendance, User staff, LocalDateTime now) {
        StaffShiftAssignment assignment = attendance.getShiftAssignmentId() == null ? null
                : shiftRepository.findById(attendance.getShiftAssignmentId()).orElse(null);
        boolean missingCheckOut = attendance.getCheckOutAt() == null && (assignment == null
                ? attendance.getWorkDate().isBefore(now.toLocalDate())
                : assignment.getScheduledEnd().isBefore(now));
        LocalDateTime end = attendance.getCheckOutAt() != null
                ? attendance.getCheckOutAt()
                : missingCheckOut ? assignment == null ? attendance.getWorkDate().atTime(23, 59, 59) : assignment.getScheduledEnd() : now;
        long minutes = Math.max(0, Duration.between(attendance.getCheckInAt(), end).toMinutes());
        return StaffAttendanceResponse.builder()
                .id(attendance.getId())
                .staffId(staff.getId())
                .staffName(staff.getFullName())
                .staffEmail(staff.getEmail())
                .workDate(attendance.getWorkDate())
                .checkInAt(attendance.getCheckInAt())
                .checkOutAt(attendance.getCheckOutAt())
                .shiftAssignmentId(attendance.getShiftAssignmentId())
                .shiftType(assignment == null ? null : assignment.getShiftType().name())
                .shiftName(assignment == null ? null : shiftName(assignment.getShiftType()))
                .scheduledStart(assignment == null ? null : assignment.getScheduledStart())
                .scheduledEnd(assignment == null ? null : assignment.getScheduledEnd())
                .durationMinutes(minutes)
                .lateMinutes(attendance.getLateMinutes())
                .earlyLeaveMinutes(attendance.getEarlyLeaveMinutes())
                .checkInMethod(attendance.getCheckInMethod())
                .checkOutMethod(attendance.getCheckOutMethod())
                .status(attendance.getCheckOutAt() != null ? "COMPLETED" : missingCheckOut ? "MISSING_CHECK_OUT" : "WORKING")
                .note(attendance.getNote())
                .build();
    }

    private StaffShiftAssignment resolveCurrentAssignment(UUID staffId, LocalDateTime now) {
        StaffShiftAssignment previous = shiftRepository.findByStaffIdAndWorkDate(staffId, now.toLocalDate().minusDays(1)).orElse(null);
        if (previous != null && previous.getApprovalStatus() == com.filmticket.entity.ShiftApprovalStatus.APPROVED
                && previous.getShiftType() == WorkShiftType.LATE && now.isBefore(previous.getScheduledEnd())) {
            return previous;
        }
        return shiftRepository.findByStaffIdAndWorkDate(staffId, now.toLocalDate())
                .filter(item -> item.getApprovalStatus() == com.filmticket.entity.ShiftApprovalStatus.APPROVED).orElse(null);
    }

    private String shiftName(WorkShiftType type) {
        return switch (type) {
            case MORNING -> "Ca sáng";
            case AFTERNOON -> "Ca chiều";
            case EVENING -> "Ca tối";
            case LATE -> "Ca khuya";
        };
    }
}
