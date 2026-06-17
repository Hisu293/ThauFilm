package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.TicketResponse;
import com.filmticket.service.StaffTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffTicketController {

    private final StaffTicketService staffTicketService;

    @Operation(summary = "List all tickets for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> listTickets() {
        return ResponseEntity.ok(ApiResponse.success("Tickets fetched successfully", staffTicketService.listTickets()));
    }

    @Operation(summary = "Get ticket detail")
    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(ApiResponse.success("Ticket fetched successfully", staffTicketService.getTicket(ticketId)));
    }

    @Operation(summary = "Check payment status for a ticket")
    @GetMapping("/{ticketId}/payment")
    public ResponseEntity<ApiResponse<?>> checkPayment(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(ApiResponse.success("Payment status fetched successfully", staffTicketService.checkPayment(ticketId)));
    }

    @Operation(summary = "Cancel a ticket")
    @PutMapping("/{ticketId}/cancel")
    public ResponseEntity<ApiResponse<TicketResponse>> cancelTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(ApiResponse.success("Ticket cancelled successfully", staffTicketService.cancelTicket(ticketId)));
    }

    @Operation(summary = "Check-in ticket by ticket code")
    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<TicketResponse>> checkIn(@RequestParam String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success("Check-in successful", staffTicketService.checkIn(ticketCode)));
    }

    @Operation(summary = "Reprint a ticket")
    @GetMapping("/{ticketId}/reprint")
    public ResponseEntity<ApiResponse<?>> reprintTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(ApiResponse.success("Ticket reprint requested", staffTicketService.reprintTicket(ticketId)));
    }
}
