package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.BookingResponse;
import com.filmticket.service.StaffBookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffBookingController {

    private final StaffBookingService staffBookingService;

    @Operation(summary = "List all bookings for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingResponse>>> listBookings() {
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", staffBookingService.listBookings()));
    }

    @Operation(summary = "Get booking detail")
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBooking(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Booking fetched successfully", staffBookingService.getBooking(bookingId)));
    }

    @Operation(summary = "Get payment status for a booking")
    @GetMapping("/{bookingId}/payment")
    public ResponseEntity<ApiResponse<?>> checkPayment(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Payment status fetched successfully", staffBookingService.checkPayment(bookingId)));
    }

    @Operation(summary = "Verify viewing access for a user")
    @GetMapping("/users/{userId}/purchased-movies")
    public ResponseEntity<ApiResponse<?>> checkAccess(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success("Access check completed", staffBookingService.checkAccess(userId)));
    }

    @Operation(summary = "Grant access back if viewing failed")
    @PostMapping("/{bookingId}/regrant-access")
    public ResponseEntity<ApiResponse<?>> regrantAccess(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Access regranted successfully", staffBookingService.regrantAccess(bookingId)));
    }

    @Operation(summary = "Cancel a booking (release seats if in HOLD status)")
    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled successfully", staffBookingService.cancelBooking(bookingId)));
    }
}
