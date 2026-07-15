package com.filmticket.service;

import com.filmticket.entity.AttendanceAccessCode;
import com.filmticket.entity.StaffShiftAssignment;
import com.filmticket.entity.WorkShiftType;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.AttendanceAccessCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AttendanceAccessCodeService {
    private static final int DYNAMIC_QR_SECONDS = 60;
    private final AttendanceAccessCodeRepository repository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public Map<String, Object> generate(UUID adminId, LocalDate workDate, WorkShiftType shiftType) {
        if (workDate == null || shiftType == null) throw new BadRequestException("Ngày làm và ca làm là bắt buộc");
        repository.findByWorkDateAndShiftTypeOrderByCreatedAtDesc(workDate, shiftType)
                .forEach(code -> { code.setActive(false); repository.save(code); });
        repository.flush();
        Window window = window(workDate, shiftType);
        AttendanceAccessCode code = repository.save(AttendanceAccessCode.builder()
                .workDate(workDate).shiftType(shiftType).qrToken(UUID.randomUUID())
                .pinCode(String.format("%06d", random.nextInt(1_000_000)))
                .validFrom(window.start.minusMinutes(60)).validUntil(window.end.plusMinutes(120))
                .active(true).createdBy(adminId).build());
        return row(code);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> latest(LocalDate workDate, WorkShiftType shiftType) {
        return repository.findByWorkDateAndShiftTypeOrderByCreatedAtDesc(workDate, shiftType).stream()
                .filter(AttendanceAccessCode::isActive).findFirst().map(this::row).orElse(null);
    }

    @Transactional
    public Map<String, Object> dynamicCode(UUID leaderId, StaffShiftAssignment assignment) {
        LocalDateTime now = LocalDateTime.now();
        List<AttendanceAccessCode> activeCodes = repository.findActiveForUpdate(
                assignment.getWorkDate(), assignment.getShiftType());
        AttendanceAccessCode code = activeCodes.stream().findFirst().orElseGet(() -> AttendanceAccessCode.builder()
                .workDate(assignment.getWorkDate()).shiftType(assignment.getShiftType())
                .createdBy(leaderId).active(true).build());
        activeCodes.stream().skip(1).forEach(duplicate -> {
            duplicate.setActive(false);
            repository.save(duplicate);
        });
        boolean notDynamic = code.getValidFrom() == null || code.getValidUntil() == null
                || java.time.Duration.between(code.getValidFrom(), code.getValidUntil()).toSeconds() > DYNAMIC_QR_SECONDS + 5;
        if (notDynamic || !code.getValidUntil().isAfter(now.plusSeconds(2))) {
            code.setQrToken(UUID.randomUUID());
            code.setPinCode(String.format("%06d", random.nextInt(1_000_000)));
            code.setValidFrom(now);
            code.setValidUntil(now.plusSeconds(DYNAMIC_QR_SECONDS));
            code.setCreatedBy(leaderId);
            code.setActive(true);
            code = repository.save(code);
        }
        Map<String, Object> result = new java.util.LinkedHashMap<>(row(code));
        result.put("serverTime", now);
        result.put("expiresInSeconds", Math.max(0, java.time.Duration.between(now, code.getValidUntil()).toSeconds()));
        result.put("dynamic", true);
        return result;
    }

    @Transactional(readOnly = true)
    public Validation validate(String credential, StaffShiftAssignment assignment, LocalDateTime now) {
        if (credential == null || credential.isBlank()) throw new BadRequestException("Vui lòng quét QR hoặc nhập mã PIN chấm công");
        String value = credential.trim();
        AttendanceAccessCode code = null;
        try { code = repository.findByQrToken(UUID.fromString(value)).orElse(null); }
        catch (IllegalArgumentException ignored) { }
        if (code == null) code = repository.findByPinCodeAndActiveTrueOrderByCreatedAtDesc(value).stream().findFirst().orElse(null);
        if (code == null || !code.isActive()) throw new BadRequestException("Mã QR/PIN không hợp lệ hoặc đã bị khóa");
        if (!code.getWorkDate().equals(assignment.getWorkDate()) || code.getShiftType() != assignment.getShiftType())
            throw new BadRequestException("Mã chấm công không thuộc ca làm được phân");
        if (now.isBefore(code.getValidFrom()) || now.isAfter(code.getValidUntil()))
            throw new BadRequestException("Mã chấm công đang ngoài thời gian hiệu lực");
        return new Validation(value.equals(code.getPinCode()) ? "PIN" : "QR", code.getId());
    }

    private Map<String, Object> row(AttendanceAccessCode code) {
        return Map.of("id", code.getId(), "workDate", code.getWorkDate(), "shiftType", code.getShiftType(),
                "qrToken", code.getQrToken(), "pinCode", code.getPinCode(), "validFrom", code.getValidFrom(),
                "validUntil", code.getValidUntil(), "active", code.isActive());
    }

    private Window window(LocalDate date, WorkShiftType type) {
        return switch (type) {
            case MORNING -> new Window(date.atTime(7, 30), date.atTime(12, 0));
            case AFTERNOON -> new Window(date.atTime(12, 0), date.atTime(17, 0));
            case EVENING -> new Window(date.atTime(17, 0), date.atTime(22, 0));
            case LATE -> new Window(date.atTime(22, 0), date.plusDays(1).atTime(1, 0));
        };
    }
    public record Validation(String method, UUID codeId) {}
    private record Window(LocalDateTime start, LocalDateTime end) {}
}
