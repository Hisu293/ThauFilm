package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkforceService {
    private static final Map<WorkShiftType, Integer> MINIMUM_STAFF = Map.of(
            WorkShiftType.MORNING, 2, WorkShiftType.AFTERNOON, 3,
            WorkShiftType.EVENING, 5, WorkShiftType.LATE, 2);
    private final UserRepository userRepository;
    private final StaffEmploymentProfileRepository profileRepository;
    private final StaffShiftAssignmentRepository shiftRepository;
    private final StaffAttendanceRepository attendanceRepository;
    private final PayrollRecordRepository payrollRepository;
    private final AttendanceAccessCodeService attendanceAccessCodeService;
    private final AuditLogService auditLogService;

    public List<Map<String, Object>> shiftDefinitions() {
        return Arrays.stream(WorkShiftType.values()).map(type -> {
            ShiftWindow window = window(type, LocalDate.now());
            return row("type", type, "name", shiftName(type), "time", shiftTime(type),
                    "startTime", window.start.toLocalTime(), "endTime", window.end.toLocalTime(),
                    "crossesMidnight", !window.start.toLocalDate().equals(window.end.toLocalDate()),
                    "description", shiftDescription(type));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> staffProfiles() {
        Map<UUID, StaffEmploymentProfile> profiles = profileRepository.findAll().stream()
                .collect(Collectors.toMap(StaffEmploymentProfile::getStaffId, Function.identity()));
        return staffUsers().stream().map(staff -> profileRow(staff, profiles.get(staff.getId()))).toList();
    }

    @Transactional
    public Map<String, Object> updateProfile(UUID staffId, EmploymentType employmentType, BigDecimal hourlyRate,
                                              BigDecimal monthlySalary, BigDecimal overtimeHourlyRate,
                                              BigDecimal defaultAllowance, Boolean shiftLeader) {
        User staff = requireStaff(staffId);
        StaffEmploymentProfile profile = profileRepository.findById(staffId)
                .orElseGet(() -> defaultProfile(staffId));
        profile.setEmploymentType(Objects.requireNonNullElse(employmentType, EmploymentType.PART_TIME));
        profile.setHourlyRate(nonNegative(hourlyRate, "Lương theo giờ"));
        profile.setMonthlySalary(nonNegative(monthlySalary, "Lương tháng"));
        profile.setOvertimeHourlyRate(nonNegative(overtimeHourlyRate, "Lương OT"));
        profile.setDefaultAllowance(nonNegative(defaultAllowance, "Phụ cấp"));
        if (shiftLeader != null) profile.setShiftLeader(shiftLeader);
        Map<String, Object> result = profileRow(staff, profileRepository.save(profile));
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.STAFF_PROFILE_UPDATED).targetType("STAFF")
                .targetId(staffId.toString()).description("Đã cập nhật hồ sơ nhân viên " + staff.getEmail())
                .newValues(result).sensitive(true).build());
        return result;
    }

    @Transactional
    public Map<String, Object> dynamicAttendanceCode(UUID staffId) {
        User staff = requireStaff(staffId);
        StaffEmploymentProfile profile = profileRepository.findById(staffId)
                .orElseThrow(() -> new BadRequestException("Nhân viên chưa có hồ sơ nhân sự"));
        if (!profile.isShiftLeader()) throw new BadRequestException("Chỉ staff trưởng mới được mở màn hình QR chấm công");
        LocalDateTime now = LocalDateTime.now();
        StaffShiftAssignment assignment = currentApprovedAssignment(staffId, now);
        if (assignment == null) throw new BadRequestException("Staff trưởng chưa có ca được duyệt tại thời điểm này");
        Map<String, Object> code = new LinkedHashMap<>(attendanceAccessCodeService.dynamicCode(staff.getId(), assignment));
        code.put("leaderName", staff.getFullName());
        code.put("shiftName", shiftName(assignment.getShiftType()));
        code.put("shiftTime", shiftTime(assignment.getShiftType()));
        return code;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> monthlySchedule(int year, int month) {
        YearMonth selected = requireMonth(year, month);
        Map<UUID, User> users = staffUsers().stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<Map<String, Object>> assignments = shiftRepository
                .findByWorkDateBetweenOrderByWorkDateAscScheduledStartAsc(selected.atDay(1), selected.atEndOfMonth())
                .stream().filter(item -> users.containsKey(item.getStaffId()))
                .map(item -> assignmentRow(item, users.get(item.getStaffId()))).toList();
        List<StaffShiftAssignment> monthAssignments = shiftRepository
                .findByWorkDateBetweenOrderByWorkDateAscScheduledStartAsc(selected.atDay(1), selected.atEndOfMonth());
        List<Map<String, Object>> coverage = coverage(selected, monthAssignments);
        long warningCount = coverage.stream().filter(item -> Boolean.TRUE.equals(item.get("understaffed"))).count();
        return row("year", year, "month", month, "definitions", shiftDefinitions(), "assignments", assignments,
                "coverage", coverage, "warningCount", warningCount);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> mySchedule(UUID staffId, int year, int month) {
        User staff = requireStaff(staffId);
        YearMonth selected = requireMonth(year, month);
        return shiftRepository.findByStaffIdAndWorkDateBetweenOrderByWorkDateAsc(
                staffId, selected.atDay(1), selected.atEndOfMonth()).stream()
                .map(item -> assignmentRow(item, staff)).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> todayShift(UUID staffId) {
        User staff = requireStaff(staffId);
        LocalDateTime now = LocalDateTime.now();
        StaffShiftAssignment assignment = currentApprovedAssignment(staffId, now);
        return assignment == null ? null : assignmentRow(assignment, staff);
    }

    @Transactional
    public Map<String, Object> assignShift(UUID staffId, LocalDate workDate, WorkShiftType shiftType, String note) {
        User staff = requireStaff(staffId);
        if (workDate == null || shiftType == null) throw new BadRequestException("Ngày làm và ca làm là bắt buộc");
        StaffShiftAssignment assignment = shiftRepository.findByStaffIdAndWorkDate(staffId, workDate)
                .orElseGet(() -> StaffShiftAssignment.builder().staffId(staffId).workDate(workDate).build());
        ShiftWindow window = window(shiftType, workDate);
        assignment.setShiftType(shiftType);
        assignment.setScheduledStart(window.start);
        assignment.setScheduledEnd(window.end);
        assignment.setNote(note == null ? null : note.trim());
        assignment.setAssignmentSource(ShiftAssignmentSource.ADMIN);
        assignment.setApprovalStatus(ShiftApprovalStatus.APPROVED);
        Map<String, Object> result = assignmentRow(shiftRepository.save(assignment), staff);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.STAFF_SHIFT_ASSIGNED).targetType("STAFF_SHIFT")
                .targetId(assignment.getId().toString()).description("Đã phân ca cho nhân viên " + staff.getEmail())
                .newValues(result).build());
        return result;
    }

    @Transactional
    public Map<String, Object> registerShift(UUID staffId, LocalDate workDate, WorkShiftType shiftType, String note) {
        User staff = requireStaff(staffId);
        if (workDate == null || shiftType == null || workDate.isBefore(LocalDate.now()))
            throw new BadRequestException("Chỉ có thể đăng ký ca từ hôm nay trở đi");
        StaffShiftAssignment assignment = shiftRepository.findByStaffIdAndWorkDate(staffId, workDate)
                .orElseGet(() -> StaffShiftAssignment.builder().staffId(staffId).workDate(workDate).build());
        if (assignment.getId() != null && assignment.getApprovalStatus() == ShiftApprovalStatus.APPROVED)
            throw new BadRequestException("Ngày này đã có ca được quản lý phê duyệt");
        ShiftWindow selected = window(shiftType, workDate);
        assignment.setShiftType(shiftType);
        assignment.setScheduledStart(selected.start);
        assignment.setScheduledEnd(selected.end);
        assignment.setNote(note == null ? null : note.trim());
        assignment.setAssignmentSource(ShiftAssignmentSource.EMPLOYEE);
        assignment.setApprovalStatus(ShiftApprovalStatus.PENDING);
        return assignmentRow(shiftRepository.save(assignment), staff);
    }

    @Transactional
    public Map<String, Object> updateShiftStatus(UUID assignmentId, ShiftApprovalStatus status) {
        if (status == null || status == ShiftApprovalStatus.PENDING) throw new BadRequestException("Trạng thái duyệt không hợp lệ");
        StaffShiftAssignment assignment = shiftRepository.findById(assignmentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đăng ký ca"));
        assignment.setApprovalStatus(status);
        return assignmentRow(shiftRepository.save(assignment), requireStaff(assignment.getStaffId()));
    }

    @Transactional
    public void deleteShift(UUID assignmentId) {
        if (!shiftRepository.existsById(assignmentId)) throw new BadRequestException("Không tìm thấy ca làm");
        shiftRepository.deleteById(assignmentId);
        auditLogService.success(AuditAction.STAFF_SHIFT_REMOVED, "STAFF_SHIFT", assignmentId,
                "Đã xóa ca làm của nhân viên");
    }

    @Transactional
    public Map<String, Object> monthlyPayroll(int year, int month) {
        YearMonth selected = requireMonth(year, month);
        LocalDate payrollMonth = selected.atDay(1);
        List<User> staff = staffUsers();
        if (staff.isEmpty()) return row("year", year, "month", month, "totalPayroll", BigDecimal.ZERO, "records", List.of());

        Map<UUID, StaffEmploymentProfile> profiles = profileRepository.findAll().stream()
                .collect(Collectors.toMap(StaffEmploymentProfile::getStaffId, Function.identity()));
        Map<UUID, User> users = staff.stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<StaffShiftAssignment> assignments = shiftRepository
                .findByWorkDateBetweenOrderByWorkDateAscScheduledStartAsc(selected.atDay(1), selected.atEndOfMonth());
        Map<UUID, StaffShiftAssignment> assignmentById = assignments.stream()
                .collect(Collectors.toMap(StaffShiftAssignment::getId, Function.identity()));
        Map<String, StaffShiftAssignment> assignmentByStaffDate = assignments.stream()
                .collect(Collectors.toMap(item -> item.getStaffId() + "|" + item.getWorkDate(), Function.identity(), (a, b) -> a));
        Map<UUID, List<StaffAttendance>> attendanceByStaff = attendanceRepository
                .findByStaffIdInAndWorkDateBetween(new ArrayList<>(users.keySet()), selected.atDay(1), selected.atEndOfMonth())
                .stream().collect(Collectors.groupingBy(StaffAttendance::getStaffId));

        List<Map<String, Object>> records = new ArrayList<>();
        BigDecimal totalPayroll = BigDecimal.ZERO;
        for (User user : staff) {
            StaffEmploymentProfile profile = profiles.computeIfAbsent(user.getId(), ignored -> profileRepository.save(defaultProfile(user.getId())));
            PayrollRecord record = payrollRepository.findByStaffIdAndPayrollMonth(user.getId(), payrollMonth)
                    .orElseGet(() -> newPayroll(user.getId(), payrollMonth, profile));
            if (record.getId() != null && record.getStatus() != PayrollStatus.DRAFT) {
                records.add(payrollRow(record, user, profile));
                totalPayroll = totalPayroll.add(record.getTotalSalary());
                continue;
            }
            long actualMinutes = 0;
            long overtimeMinutes = 0;
            for (StaffAttendance attendance : attendanceByStaff.getOrDefault(user.getId(), List.of())) {
                StaffShiftAssignment assignment = attendance.getShiftAssignmentId() == null ? null : assignmentById.get(attendance.getShiftAssignmentId());
                if (assignment == null) assignment = assignmentByStaffDate.get(user.getId() + "|" + attendance.getWorkDate());
                long worked = workedMinutes(attendance, assignment, LocalDateTime.now());
                actualMinutes += worked;
                if (profile.getEmploymentType() == EmploymentType.FULL_TIME && assignment != null) {
                    long scheduled = Duration.between(assignment.getScheduledStart(), assignment.getScheduledEnd()).toMinutes();
                    overtimeMinutes += Math.max(0, worked - scheduled);
                }
            }
            BigDecimal baseSalary = profile.getEmploymentType() == EmploymentType.PART_TIME
                    ? hourlyAmount(profile.getHourlyRate(), actualMinutes)
                    : profile.getMonthlySalary();
            BigDecimal overtimePay = profile.getEmploymentType() == EmploymentType.FULL_TIME
                    ? hourlyAmount(profile.getOvertimeHourlyRate(), overtimeMinutes) : BigDecimal.ZERO;
            record.setEmploymentType(profile.getEmploymentType());
            record.setRegularMinutes(actualMinutes);
            record.setOvertimeMinutes(overtimeMinutes);
            record.setBaseSalary(baseSalary);
            record.setOvertimePay(overtimePay);
            if (record.getAllowance() == null) record.setAllowance(profile.getDefaultAllowance());
            if (record.getBonus() == null) record.setBonus(BigDecimal.ZERO);
            if (record.getDeduction() == null) record.setDeduction(BigDecimal.ZERO);
            record.setTotalSalary(total(record));
            record = payrollRepository.save(record);
            records.add(payrollRow(record, user, profile));
            totalPayroll = totalPayroll.add(record.getTotalSalary());
        }
        records.sort((a, b) -> ((BigDecimal) b.get("totalSalary")).compareTo((BigDecimal) a.get("totalSalary")));
        return row("year", year, "month", month, "totalPayroll", totalPayroll, "records", records);
    }

    @Transactional
    public Map<String, Object> updatePayroll(UUID payrollId, BigDecimal allowance, BigDecimal bonus,
                                              BigDecimal deduction, PayrollStatus status, String note) {
        PayrollRecord record = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy bảng lương"));
        User staff = requireStaff(record.getStaffId());
        StaffEmploymentProfile profile = profileRepository.findById(staff.getId()).orElseGet(() -> defaultProfile(staff.getId()));
        record.setAllowance(nonNegative(allowance, "Phụ cấp"));
        record.setBonus(nonNegative(bonus, "Thưởng"));
        record.setDeduction(nonNegative(deduction, "Khấu trừ"));
        if (status != null) record.setStatus(status);
        record.setNote(note == null ? record.getNote() : note.trim());
        record.setTotalSalary(total(record));
        Map<String, Object> result = payrollRow(payrollRepository.save(record), staff, profile);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.STAFF_PAYROLL_UPDATED).targetType("PAYROLL")
                .targetId(payrollId.toString()).description("Đã cập nhật bảng lương của nhân viên " + staff.getEmail())
                .reason(note).newValues(result).sensitive(true).build());
        return result;
    }

    private List<User> staffUsers() {
        return userRepository.findAll().stream().filter(user -> user.getRole() == User.Role.STAFF).toList();
    }

    private User requireStaff(UUID staffId) {
        User user = userRepository.findById(staffId).orElseThrow(() -> new BadRequestException("Không tìm thấy nhân viên"));
        if (user.getRole() != User.Role.STAFF) throw new BadRequestException("Tài khoản không phải nhân viên");
        return user;
    }

    private StaffEmploymentProfile defaultProfile(UUID staffId) {
        return StaffEmploymentProfile.builder().staffId(staffId).build();
    }

    private PayrollRecord newPayroll(UUID staffId, LocalDate month, StaffEmploymentProfile profile) {
        return PayrollRecord.builder().staffId(staffId).payrollMonth(month).employmentType(profile.getEmploymentType())
                .baseSalary(BigDecimal.ZERO).overtimePay(BigDecimal.ZERO).allowance(profile.getDefaultAllowance())
                .bonus(BigDecimal.ZERO).deduction(BigDecimal.ZERO).totalSalary(BigDecimal.ZERO).build();
    }

    private BigDecimal total(PayrollRecord record) {
        return record.getBaseSalary().add(record.getOvertimePay()).add(record.getAllowance())
                .add(record.getBonus()).subtract(record.getDeduction()).max(BigDecimal.ZERO);
    }

    private BigDecimal hourlyAmount(BigDecimal rate, long minutes) {
        return rate.multiply(BigDecimal.valueOf(minutes)).divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP);
    }

    private long workedMinutes(StaffAttendance attendance, StaffShiftAssignment assignment, LocalDateTime now) {
        LocalDateTime end = attendance.getCheckOutAt();
        if (end == null) {
            if (assignment != null && assignment.getScheduledEnd().isBefore(now)) end = assignment.getScheduledEnd();
            else if (attendance.getWorkDate().isBefore(now.toLocalDate())) end = attendance.getWorkDate().atTime(23, 59, 59);
            else end = now;
        }
        return Math.max(0, Duration.between(attendance.getCheckInAt(), end).toMinutes());
    }

    private Map<String, Object> assignmentRow(StaffShiftAssignment item, User staff) {
        return row("id", item.getId(), "staffId", staff.getId(), "staffName", staff.getFullName(),
                "staffEmail", staff.getEmail(), "workDate", item.getWorkDate(), "shiftType", item.getShiftType(),
                "shiftName", shiftName(item.getShiftType()), "shiftTime", shiftTime(item.getShiftType()),
                "scheduledStart", item.getScheduledStart(), "scheduledEnd", item.getScheduledEnd(),
                "description", shiftDescription(item.getShiftType()), "note", item.getNote(),
                "assignmentSource", item.getAssignmentSource(), "approvalStatus", item.getApprovalStatus());
    }

    private List<Map<String, Object>> coverage(YearMonth month, List<StaffShiftAssignment> assignments) {
        Map<String, Long> counts = assignments.stream()
                .filter(item -> item.getApprovalStatus() == ShiftApprovalStatus.APPROVED)
                .collect(Collectors.groupingBy(item -> item.getWorkDate() + "|" + item.getShiftType(), Collectors.counting()));
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate from = month.atDay(1).isBefore(LocalDate.now()) ? LocalDate.now() : month.atDay(1);
        for (LocalDate day = from; !day.isAfter(month.atEndOfMonth()); day = day.plusDays(1)) {
            for (WorkShiftType type : WorkShiftType.values()) {
                int required = MINIMUM_STAFF.get(type);
                int assigned = counts.getOrDefault(day + "|" + type, 0L).intValue();
                result.add(row("workDate", day, "shiftType", type, "shiftName", shiftName(type),
                        "minimumRequired", required, "assigned", assigned, "shortage", Math.max(0, required - assigned),
                        "understaffed", assigned < required));
            }
        }
        return result;
    }

    private Map<String, Object> profileRow(User staff, StaffEmploymentProfile profile) {
        StaffEmploymentProfile value = profile == null ? defaultProfile(staff.getId()) : profile;
        return row("staffId", staff.getId(), "staffName", staff.getFullName(), "staffEmail", staff.getEmail(),
                "employmentType", value.getEmploymentType(), "hourlyRate", value.getHourlyRate(),
                "monthlySalary", value.getMonthlySalary(), "overtimeHourlyRate", value.getOvertimeHourlyRate(),
                "defaultAllowance", value.getDefaultAllowance(), "shiftLeader", value.isShiftLeader());
    }

    private StaffShiftAssignment currentApprovedAssignment(UUID staffId, LocalDateTime now) {
        StaffShiftAssignment previous = shiftRepository.findByStaffIdAndWorkDate(staffId, now.toLocalDate().minusDays(1)).orElse(null);
        if (previous != null && previous.getApprovalStatus() == ShiftApprovalStatus.APPROVED
                && previous.getShiftType() == WorkShiftType.LATE && now.isBefore(previous.getScheduledEnd().plusMinutes(120))) return previous;
        return shiftRepository.findByStaffIdAndWorkDate(staffId, now.toLocalDate())
                .filter(item -> item.getApprovalStatus() == ShiftApprovalStatus.APPROVED
                        && !now.isBefore(item.getScheduledStart().minusMinutes(60))
                        && !now.isAfter(item.getScheduledEnd().plusMinutes(120)))
                .orElse(null);
    }

    private Map<String, Object> payrollRow(PayrollRecord record, User staff, StaffEmploymentProfile profile) {
        return row("id", record.getId(), "staffId", staff.getId(), "staffName", staff.getFullName(),
                "staffEmail", staff.getEmail(), "employmentType", record.getEmploymentType(),
                "regularMinutes", record.getRegularMinutes(), "overtimeMinutes", record.getOvertimeMinutes(),
                "baseSalary", record.getBaseSalary(), "overtimePay", record.getOvertimePay(),
                "allowance", record.getAllowance(), "bonus", record.getBonus(), "deduction", record.getDeduction(),
                "totalSalary", record.getTotalSalary(), "status", record.getStatus(), "note", record.getNote(),
                "hourlyRate", profile.getHourlyRate(), "monthlySalary", profile.getMonthlySalary());
    }

    private ShiftWindow window(WorkShiftType type, LocalDate date) {
        return switch (type) {
            case MORNING -> new ShiftWindow(date.atTime(7, 30), date.atTime(12, 0));
            case AFTERNOON -> new ShiftWindow(date.atTime(12, 0), date.atTime(17, 0));
            case EVENING -> new ShiftWindow(date.atTime(17, 0), date.atTime(22, 0));
            case LATE -> new ShiftWindow(date.atTime(22, 0), date.plusDays(1).atTime(1, 0));
        };
    }

    private String shiftName(WorkShiftType type) {
        return switch (type) { case MORNING -> "Ca sáng"; case AFTERNOON -> "Ca chiều"; case EVENING -> "Ca tối"; case LATE -> "Ca khuya"; };
    }

    private String shiftTime(WorkShiftType type) {
        return switch (type) { case MORNING -> "07:30 – 12:00"; case AFTERNOON -> "12:00 – 17:00"; case EVENING -> "17:00 – 22:00"; case LATE -> "22:00 – 01:00"; };
    }

    private String shiftDescription(WorkShiftType type) {
        return switch (type) {
            case MORNING -> "Chuẩn bị rạp, mở cửa, bán vé và bắp nước";
            case AFTERNOON -> "Phục vụ các suất chiếu trưa và chiều";
            case EVENING -> "Phục vụ giờ cao điểm và lượng khách lớn";
            case LATE -> "Suất chiếu muộn, vệ sinh và kiểm kê cuối ngày";
        };
    }

    private BigDecimal nonNegative(BigDecimal value, String field) {
        BigDecimal result = Objects.requireNonNullElse(value, BigDecimal.ZERO);
        if (result.signum() < 0) throw new BadRequestException(field + " không được âm");
        return result;
    }

    private YearMonth requireMonth(int year, int month) {
        try { return YearMonth.of(year, month); }
        catch (RuntimeException exception) { throw new BadRequestException("Tháng không hợp lệ"); }
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2) result.put((String) values[index], values[index + 1]);
        return result;
    }

    private record ShiftWindow(LocalDateTime start, LocalDateTime end) {}
}
