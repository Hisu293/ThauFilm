package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.StaffAttendanceResponse;
import com.filmticket.dto.UpdateStaffAttendanceRequest;
import com.filmticket.service.StaffAttendanceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminAttendanceController {
    private final StaffAttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> monthly(
            @RequestParam int year,
            @RequestParam int month
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Staff attendance fetched",
                attendanceService.adminMonthly(year, month)
        ));
    }

    @PutMapping("/{attendanceId}")
    public ResponseEntity<ApiResponse<StaffAttendanceResponse>> update(
            @PathVariable UUID attendanceId,
            @RequestBody UpdateStaffAttendanceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Staff attendance updated",
                attendanceService.adminUpdate(attendanceId, request)
        ));
    }
}
