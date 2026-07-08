package com.filmticket.controller;

import com.filmticket.dto.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.GroupBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/member/group-bookings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
public class GroupBookingController {
    private final GroupBookingService groupBookingService;
    private final UserRepository userRepository;

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupBookingDto.Response>> get(@PathVariable UUID groupId) {
        return ResponseEntity.ok(ApiResponse.success("Đã tải booking nhóm", groupBookingService.get(groupId, userId())));
    }

    @PostMapping("/{groupId}/seats")
    public ResponseEntity<ApiResponse<GroupBookingDto.Response>> selectSeats(
            @PathVariable UUID groupId, @Valid @RequestBody GroupBookingDto.SelectSeatsRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã giữ cặp ghế", groupBookingService.selectSeats(groupId, userId(), request.getSeatIds())));
    }

    @PostMapping("/{groupId}/pay")
    public ResponseEntity<ApiResponse<GroupBookingDto.Response>> pay(
            @PathVariable UUID groupId, @Valid @RequestBody PayBookingRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận thanh toán", groupBookingService.pay(groupId, userId(), request)));
    }

    private UUID userId() {
        UserDetails principal = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found")).getId();
    }
}
