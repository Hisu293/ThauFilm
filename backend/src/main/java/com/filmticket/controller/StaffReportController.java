package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.StaffReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/staff/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffReportController {

    private final StaffReportService staffReportService;

    @Operation(summary = "Staff dashboard statistics")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success("Staff dashboard fetched", staffReportService.dashboard()));
    }

    @Operation(summary = "Customer statistics")
    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> customers() {
        return ResponseEntity.ok(ApiResponse.success("Customer statistics fetched", staffReportService.customers()));
    }

    @Operation(summary = "Revenue report by date")
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<Map<String, Object>>> revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success("Revenue report fetched", staffReportService.revenue(from, to)));
    }

    @Operation(summary = "Ticket sales report")
    @GetMapping("/ticket-sales")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ticketSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success("Ticket sales report fetched", staffReportService.ticketSales(from, to)));
    }

    @Operation(summary = "Online movie sales report")
    @GetMapping("/online-movie-sales")
    public ResponseEntity<ApiResponse<Map<String, Object>>> onlineMovieSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success("Online movie sales report fetched", staffReportService.onlineMovieSales(from, to)));
    }

    @Operation(summary = "Top movies report")
    @GetMapping("/top-movies")
    public ResponseEntity<ApiResponse<Map<String, Object>>> topMovies(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success("Top movies report fetched", staffReportService.topMovies(limit)));
    }

    @Operation(summary = "Top showtimes report")
    @GetMapping("/top-showtimes")
    public ResponseEntity<ApiResponse<Map<String, Object>>> topShowtimes(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success("Top showtimes report fetched", staffReportService.topShowtimes(limit)));
    }
}
