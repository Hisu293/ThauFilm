package com.filmticket.controller;

import com.filmticket.dto.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.BookingService;
import com.filmticket.service.ComboService;
import com.filmticket.service.DiscountService;
import com.filmticket.service.TicketQueueService;
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
    private final TicketQueueService ticketQueueService;

    // ĐÃ SỬA: Lấy thêm userId để truyền xuống Service nhận diện cờ isHeldByMe
    @Operation(summary = "Get available seats for a showtime")
    @GetMapping("/showtimes/{showtimeId}/seats")
    public ResponseEntity<ApiResponse<List<ShowtimeSeatResponse>>> getAvailableSeats(
            @PathVariable UUID showtimeId
    ) {
        UUID userId = getCurrentUserId(); // Lấy ID của user đang đăng nhập
        return ResponseEntity.ok(ApiResponse.success(
                "Available seats fetched",
                bookingService.getAvailableSeats(showtimeId, userId)
        ));
    }

    @Operation(summary = "Suggest adjacent seats for a group")
    @GetMapping("/showtimes/{showtimeId}/seat-suggestions")
    public ResponseEntity<ApiResponse<SeatSuggestionResponse>> suggestSeats(
            @PathVariable UUID showtimeId,
            @RequestParam(defaultValue = "2") int count
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Seat suggestion generated",
                bookingService.suggestSeats(showtimeId, count)
        ));
    }

    @Operation(summary = "Join showtime seat selection queue")
    @PostMapping("/showtimes/{showtimeId}/queue/join")
    public ResponseEntity<ApiResponse<TicketQueueStatusResponse>> joinQueue(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Queue joined",
                ticketQueueService.join(showtimeId, getCurrentUserId())
        ));
    }

    @Operation(summary = "Get showtime seat selection queue status")
    @GetMapping("/showtimes/{showtimeId}/queue/status")
    public ResponseEntity<ApiResponse<TicketQueueStatusResponse>> queueStatus(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Queue status fetched",
                ticketQueueService.status(showtimeId, getCurrentUserId())
        ));
    }

    @Operation(summary = "Heartbeat for showtime seat selection presence")
    @PostMapping("/showtimes/{showtimeId}/queue/heartbeat")
    public ResponseEntity<ApiResponse<TicketQueueStatusResponse>> queueHeartbeat(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Queue heartbeat recorded",
                ticketQueueService.heartbeat(showtimeId, getCurrentUserId())
        ));
    }

    @Operation(summary = "Leave showtime seat selection queue")
    @PostMapping("/showtimes/{showtimeId}/queue/leave")
    public ResponseEntity<ApiResponse<TicketQueueStatusResponse>> leaveQueue(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Queue left",
                ticketQueueService.leave(showtimeId, getCurrentUserId())
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

    // ĐÃ THÊM: API đổi ghế khi người dùng quay lại từ màn hình thanh toán
    @Operation(summary = "Update seats for an existing booking hold (Back to change seats)")
    @PutMapping("/{bookingId}/seats")
    public ResponseEntity<ApiResponse<BookingResponse>> updateBookingSeats(
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingSeatsRequest request
    ) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                "Booking seats updated successfully. Hold timer reset.",
                bookingService.updateBookingSeats(bookingId, userId, request)
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

    @Operation(summary = "Cancel my booking (release seats if in HOLD status)")
    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(@PathVariable UUID bookingId) {
        UUID userId = getCurrentUserId();
        bookingService.cancelBooking(bookingId, userId);
        return ResponseEntity.ok(ApiResponse.success(
                "Booking cancelled successfully",
                bookingService.getBookingDetail(bookingId, userId)
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
