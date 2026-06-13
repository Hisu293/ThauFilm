package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CinemaRoomRequest;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.SeatResponse;
import com.filmticket.dto.UpsertSeatRequest;
import com.filmticket.service.CinemaRoomService;
import com.filmticket.service.SeatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminCinemaRoomController {

    private final CinemaRoomService cinemaRoomService;
    private final SeatService seatService;

    @Operation(summary = "Create a cinema room")
    @PostMapping("/rooms")
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> createRoom(@Valid @RequestBody CinemaRoomRequest request) {
        CinemaRoomResponse response = cinemaRoomService.createRoomAndGenerateSeats(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cinema room created successfully", response));
    }

    @Operation(summary = "List seats by room")
    @GetMapping("/rooms/{roomId}/seats")
    public ResponseEntity<ApiResponse<List<SeatResponse>>> getSeatsByRoom(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Seats fetched successfully",
                cinemaRoomService.getSeatsByRoomId(roomId)
        ));
    }

    @Operation(summary = "Create a seat")
    @PostMapping("/seats")
    public ResponseEntity<ApiResponse<SeatResponse>> createSeat(@Valid @RequestBody UpsertSeatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Seat created successfully", seatService.createSeat(request)));
    }

    @Operation(summary = "Update a seat")
    @PutMapping("/seats/{id}")
    public ResponseEntity<ApiResponse<SeatResponse>> updateSeat(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertSeatRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Seat updated successfully", seatService.updateSeat(id, request)));
    }

    @Operation(summary = "Delete a seat")
    @DeleteMapping("/seats/{id}")
    public ResponseEntity<Void> deleteSeat(@PathVariable UUID id) {
        seatService.deleteSeat(id);
        return ResponseEntity.noContent().build();
    }
}
