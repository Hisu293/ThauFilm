package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.StaffAttendanceResponse;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.StaffAttendanceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/staff/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STAFF')")
@SecurityRequirement(name = "bearerAuth")
public class StaffAttendanceController {
    private final StaffAttendanceService attendanceService;
    private final CurrentUserService currentUserService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<StaffAttendanceResponse>> today(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Today's attendance fetched",
                attendanceService.today(currentUserService.requireUserId(principal))
        ));
    }

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<StaffAttendanceResponse>> checkIn(
            @AuthenticationPrincipal UserDetails principal, @RequestBody CredentialRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Checked in successfully",
                attendanceService.checkIn(currentUserService.requireUserId(principal), request.credential())
        ));
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<StaffAttendanceResponse>> checkOut(
            @AuthenticationPrincipal UserDetails principal, @RequestBody CredentialRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Checked out successfully",
                attendanceService.checkOut(currentUserService.requireUserId(principal), request.credential())
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<StaffAttendanceResponse>>> history(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        LocalDate today = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(
                "Attendance history fetched",
                attendanceService.myHistory(
                        currentUserService.requireUserId(principal),
                        year == null ? today.getYear() : year,
                        month == null ? today.getMonthValue() : month
                )
        ));
    }

    public record CredentialRequest(String credential) {}
}
