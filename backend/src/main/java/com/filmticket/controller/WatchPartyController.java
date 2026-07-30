package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.dto.WatchPartyDto;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.WatchPartyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/member/watch-parties")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
public class WatchPartyController {
    private final WatchPartyService watchPartyService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> create(@Valid @RequestBody WatchPartyDto.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Watch party created",
                watchPartyService.create(request.getMovieId(), userId())
        ));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> get(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Watch party fetched",
                watchPartyService.get(roomId, userId())
        ));
    }

    @PostMapping("/{roomId}/pay")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> pay(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Watch party payment recorded",
                watchPartyService.pay(roomId, userId())
        ));
    }

    @PostMapping("/{roomId}/sync-payment")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> syncPayment(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Watch party payment synced",
                watchPartyService.syncCurrentUserPayment(roomId, userId())
        ));
    }

    @GetMapping("/{roomId}/stream")
    public ResponseEntity<ApiResponse<MovieStreamResponse>> stream(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Watch party stream fetched",
                watchPartyService.getStream(roomId, userId())
        ));
    }

    @PostMapping("/{roomId}/refund")
    public ResponseEntity<ApiResponse<Void>> refund(@PathVariable UUID roomId,
                                                     @RequestBody WatchPartyDto.RefundRequest request) {
        watchPartyService.requestRefund(roomId, userId(), request.getRefundMethod(),
                request.getBankBin(), request.getAccountNumber());
        return ResponseEntity.ok(ApiResponse.success("Refund request created", null));
    }

    private UUID userId() {
        UserDetails principal = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found")).getId();
    }
}
