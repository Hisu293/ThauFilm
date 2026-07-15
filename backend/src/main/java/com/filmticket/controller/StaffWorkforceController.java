package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.CurrentUserService;
import com.filmticket.service.WorkforceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff/workforce")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STAFF')")
public class StaffWorkforceController {
    private final WorkforceService workforceService;
    private final CurrentUserService currentUserService;

    @GetMapping("/schedule/today")
    public ResponseEntity<ApiResponse<Map<String, Object>>> today(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success("Today's shift fetched",
                workforceService.todayShift(currentUserService.requireUserId(principal))));
    }

    @GetMapping("/schedule")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> schedule(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate today = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success("Staff schedule fetched", workforceService.mySchedule(
                currentUserService.requireUserId(principal), year == null ? today.getYear() : year,
                month == null ? today.getMonthValue() : month)));
    }
}
