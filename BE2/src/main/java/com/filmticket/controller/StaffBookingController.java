package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.TicketResponse;
import com.filmticket.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffBookingController {

    private final BookingService bookingService;

    @Operation(summary = "Check in a ticket by code")
    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<TicketResponse>> checkIn(
            @RequestParam String ticketCode
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Check-in successful",
                bookingService.checkIn(ticketCode)
        ));
    }
}
