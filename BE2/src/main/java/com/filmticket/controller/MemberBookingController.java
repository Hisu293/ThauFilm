package com.filmticket.controller;

import com.filmticket.dto.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.BookingService;
import com.filmticket.service.ComboService;
import com.filmticket.service.DiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/member/booking")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class MemberBookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final ComboService comboService;
    private final DiscountService discountService;

    @Operation(summary = "Get available seats for a showtime")
    @GetMapping("/showtimes/{showtimeId}/seats")
    public ResponseEntity<ApiResponse<List<ShowtimeSeatResponse>>> getAvailableSeats(
            @PathVariable UUID showtimeId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Available seats fetched",
                bookingService.getAvailableSeats(showtimeId)
        ));
    }

    @Operation(summary = "Create a booking (hold seats)")
    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody CreateBookingRequest request
    ) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Booking created. Complete payment before hold expires.",
                bookingService.createBooking(userId, request)
        ));
    }

    @Operation(summary = "Pay and confirm a booking")
    @PostMapping("/{bookingId}/pay")
    public ResponseEntity<ApiResponse<BookingPaymentResponse>> payBooking(
            @PathVariable UUID bookingId,
            @Valid @RequestBody PayBookingRequest request
    ) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Payment successful. Tickets generated.",
                bookingService.payBooking(bookingId, userId, request)
        ));
    }

    @Operation(summary = "Get my bookings")
    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Bookings fetched",
                bookingService.getMyBookings(userId)
        ));
    }

    @Operation(summary = "Get booking detail")
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingDetail(
            @PathVariable UUID bookingId
    ) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Booking detail fetched",
                bookingService.getBookingDetail(bookingId, userId)
        ));
    }

    @Operation(summary = "Get tickets for a booking")
    @GetMapping("/{bookingId}/tickets")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getBookingTickets(
            @PathVariable UUID bookingId
    ) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Tickets fetched",
                bookingService.getBookingTickets(bookingId, userId)
        ));
    }

    @Operation(summary = "List active combos for member")
    @GetMapping("/combos")
    public ResponseEntity<ApiResponse<List<ComboResponse>>> getActiveCombos() {
        return ResponseEntity.ok(ApiResponse.success(
                "Active combos fetched",
                comboService.getAllActiveCombos()
        ));
    }

    @Operation(summary = "List active discounts for member")
    @GetMapping("/discounts")
    public ResponseEntity<ApiResponse<List<DiscountResponse>>> getActiveDiscounts() {
        return ResponseEntity.ok(ApiResponse.success(
                "Active discounts fetched",
                discountService.getActiveDiscounts()
        ));
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found"))
                .getId();
    }
}
