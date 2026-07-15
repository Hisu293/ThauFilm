package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.entity.EmploymentType;
import com.filmticket.entity.PayrollStatus;
import com.filmticket.entity.WorkShiftType;
import com.filmticket.service.WorkforceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/workforce")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminWorkforceController {
    private final WorkforceService workforceService;

    @GetMapping("/shift-definitions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> definitions() {
        return ResponseEntity.ok(ApiResponse.success("Shift definitions fetched", workforceService.shiftDefinitions()));
    }

    @GetMapping("/staff")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> staff() {
        return ResponseEntity.ok(ApiResponse.success("Staff profiles fetched", workforceService.staffProfiles()));
    }

    @PutMapping("/staff/{staffId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(@PathVariable UUID staffId, @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Staff profile updated", workforceService.updateProfile(staffId,
                request.employmentType(), request.hourlyRate(), request.monthlySalary(), request.overtimeHourlyRate(), request.defaultAllowance())));
    }

    @GetMapping("/shifts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> shifts(@RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.success("Shift schedule fetched", workforceService.monthlySchedule(year, month)));
    }

    @PostMapping("/shifts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assign(@RequestBody ShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Shift assigned", workforceService.assignShift(
                request.staffId(), request.workDate(), request.shiftType(), request.note())));
    }

    @DeleteMapping("/shifts/{assignmentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID assignmentId) {
        workforceService.deleteShift(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/payroll")
    public ResponseEntity<ApiResponse<Map<String, Object>>> payroll(@RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(ApiResponse.success("Payroll calculated", workforceService.monthlyPayroll(year, month)));
    }

    @PutMapping("/payroll/{payrollId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePayroll(@PathVariable UUID payrollId, @RequestBody PayrollRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payroll updated", workforceService.updatePayroll(payrollId,
                request.allowance(), request.bonus(), request.deduction(), request.status(), request.note())));
    }

    public record ShiftRequest(UUID staffId, LocalDate workDate, WorkShiftType shiftType, String note) {}
    public record ProfileRequest(EmploymentType employmentType, BigDecimal hourlyRate, BigDecimal monthlySalary,
                                 BigDecimal overtimeHourlyRate, BigDecimal defaultAllowance) {}
    public record PayrollRequest(BigDecimal allowance, BigDecimal bonus, BigDecimal deduction, PayrollStatus status, String note) {}
}
