package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.dto.RefundRequestDto;
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
                "Tạo phòng Watch Party thành công",
                watchPartyService.create(request.getMovieId(), request.getShowtimeId(), userId())
        ));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> get(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy thông tin phòng Watch Party thành công",
                watchPartyService.get(roomId, userId())
        ));
    }

    @PostMapping("/{roomId}/pay")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> pay(
            @PathVariable UUID roomId,
            @RequestHeader(value = "Origin", required = false) String frontendOrigin) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã tạo thanh toán phần của bạn",
                watchPartyService.pay(roomId, userId(), frontendOrigin)
        ));
    }

    @PostMapping("/{roomId}/sync-payment")
    public ResponseEntity<ApiResponse<WatchPartyDto.Response>> syncPayment(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật trạng thái thanh toán Watch Party",
                watchPartyService.syncCurrentUserPayment(roomId, userId())
        ));
    }

    @GetMapping("/{roomId}/stream")
    public ResponseEntity<ApiResponse<MovieStreamResponse>> stream(
            @PathVariable UUID roomId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy nội dung xem Watch Party thành công",
                watchPartyService.getStream(roomId, userId(), deviceId)
        ));
    }

    @PostMapping("/{roomId}/stream/heartbeat")
    public ResponseEntity<ApiResponse<Void>> streamHeartbeat(
            @PathVariable UUID roomId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        watchPartyService.heartbeatStream(roomId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Đã duy trì phiên xem Watch Party", null));
    }

    @PostMapping("/{roomId}/stream/release")
    public ResponseEntity<ApiResponse<Void>> streamRelease(
            @PathVariable UUID roomId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        watchPartyService.releaseStream(roomId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Đã đóng phiên xem Watch Party", null));
    }

    @PostMapping("/{roomId}/refund")
    public ResponseEntity<ApiResponse<RefundRequestDto>> refund(
            @PathVariable UUID roomId, @RequestBody WatchPartyDto.RefundRequest request) {
        RefundRequestDto created = watchPartyService.requestRefund(
                roomId, userId(), request.getReason(), request.getRefundMethod(),
                request.getBankBin(), request.getAccountNumber());
        return ResponseEntity.ok(ApiResponse.success("Đã tạo yêu cầu hoàn tiền", created));
    }

    private UUID userId() {
        UserDetails principal = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng")).getId();
    }
}
