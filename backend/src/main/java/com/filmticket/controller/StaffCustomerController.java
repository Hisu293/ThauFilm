package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.UserResponse;
import com.filmticket.service.StaffCustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffCustomerController {

    private final StaffCustomerService staffCustomerService;

    @Operation(summary = "List customers for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> listCustomers() {
        return ResponseEntity.ok(ApiResponse.success("Customers fetched successfully", staffCustomerService.listCustomers()));
    }

    @Operation(summary = "Get customer detail")
    @GetMapping("/{customerId}")
    public ResponseEntity<ApiResponse<UserResponse>> getCustomer(@PathVariable UUID customerId) {
        return ResponseEntity.ok(ApiResponse.success("Customer fetched successfully", staffCustomerService.getCustomer(customerId)));
    }

    @Operation(summary = "Get customer booking history")
    @GetMapping("/{customerId}/bookings")
    public ResponseEntity<ApiResponse<?>> getBookingHistory(@PathVariable UUID customerId) {
        return ResponseEntity.ok(ApiResponse.success("Booking history fetched successfully", staffCustomerService.getBookingHistory(customerId)));
    }

    @Operation(summary = "Get customer online purchase history")
    @GetMapping("/{customerId}/online-movies")
    public ResponseEntity<ApiResponse<?>> getOnlinePurchaseHistory(@PathVariable UUID customerId) {
        return ResponseEntity.ok(ApiResponse.success("Online purchase history fetched successfully", staffCustomerService.getOnlinePurchaseHistory(customerId)));
    }

    @Operation(summary = "Lock a customer account")
    @PutMapping("/{customerId}/lock")
    public ResponseEntity<ApiResponse<UserResponse>> lockCustomer(@PathVariable UUID customerId) {
        return ResponseEntity.ok(ApiResponse.success("Customer locked successfully", staffCustomerService.lockCustomer(customerId)));
    }

    @Operation(summary = "Unlock a customer account")
    @PutMapping("/{customerId}/unlock")
    public ResponseEntity<ApiResponse<UserResponse>> unlockCustomer(@PathVariable UUID customerId) {
        return ResponseEntity.ok(ApiResponse.success("Customer unlocked successfully", staffCustomerService.unlockCustomer(customerId)));
    }

    @Operation(summary = "Handle customer complaint")
    @PostMapping("/{customerId}/complaints")
    public ResponseEntity<ApiResponse<?>> handleComplaint(
            @PathVariable UUID customerId,
            @RequestBody String complaintDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success("Complaint handled successfully", staffCustomerService.handleComplaint(customerId, complaintDetails)));
    }
}
