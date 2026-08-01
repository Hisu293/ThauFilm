package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.MovieStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/member/movies")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
public class MemberMovieStreamController {
    private final MovieStreamService movieStreamService;
    private final UserRepository userRepository;

    @GetMapping("/{movieId}/stream")
    public ResponseEntity<ApiResponse<MovieStreamResponse>> stream(
            @PathVariable UUID movieId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Movie stream fetched",
                movieStreamService.getMovieStream(movieId, userId(), false, deviceId)
        ));
    }

    @PostMapping("/{movieId}/stream/heartbeat")
    public ResponseEntity<ApiResponse<Void>> heartbeat(
            @PathVariable UUID movieId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        movieStreamService.heartbeat(movieId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Viewing session refreshed", null));
    }

    @PostMapping("/{movieId}/stream/{bookingId}/heartbeat")
    public ResponseEntity<ApiResponse<Void>> heartbeatBooking(
            @PathVariable UUID movieId,
            @PathVariable UUID bookingId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        movieStreamService.heartbeatBooking(movieId, bookingId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Viewing session refreshed", null));
    }

    @PostMapping("/{movieId}/stream/release")
    public ResponseEntity<ApiResponse<Void>> release(
            @PathVariable UUID movieId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        movieStreamService.release(movieId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Viewing session released", null));
    }

    @PostMapping("/{movieId}/stream/{bookingId}/release")
    public ResponseEntity<ApiResponse<Void>> releaseBooking(
            @PathVariable UUID movieId,
            @PathVariable UUID bookingId,
            @RequestHeader("X-Viewing-Device-Id") String deviceId) {
        movieStreamService.releaseBooking(movieId, bookingId, userId(), deviceId);
        return ResponseEntity.ok(ApiResponse.success("Viewing session released", null));
    }

    private UUID userId() {
        UserDetails principal = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found")).getId();
    }
}
