package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.StaffReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminReportController {
    private final StaffReportService reportService;

    @GetMapping("/revenue/monthly")
    public ResponseEntity<ApiResponse<Map<String, Object>>> monthlyRevenue(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        LocalDate today = LocalDate.now();
        int selectedYear = year == null ? today.getYear() : year;
        int selectedMonth = month == null ? today.getMonthValue() : month;
        return ResponseEntity.ok(ApiResponse.success(
                "Monthly revenue fetched",
                reportService.monthlyRevenue(selectedYear, selectedMonth)
        ));
    }

    @GetMapping("/tickets/monthly")
    public ResponseEntity<ApiResponse<Map<String, Object>>> monthlyTickets(
            @RequestParam(required = false) Integer year, @RequestParam(required = false) Integer month) {
        LocalDate today = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success("Monthly ticket analytics fetched",
                reportService.monthlyTicketAnalytics(year == null ? today.getYear() : year,
                        month == null ? today.getMonthValue() : month)));
    }

    @GetMapping("/customers/monthly")
    public ResponseEntity<ApiResponse<Map<String, Object>>> monthlyCustomers(
            @RequestParam(required = false) Integer year, @RequestParam(required = false) Integer month) {
        LocalDate today = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success("Monthly customer analytics fetched",
                reportService.monthlyCustomerAnalytics(year == null ? today.getYear() : year,
                        month == null ? today.getMonthValue() : month)));
    }
}
