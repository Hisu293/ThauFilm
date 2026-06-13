package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CinemaRoomRequest;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.CinemaRoomUpdateRequest;
import com.filmticket.dto.SeatMapResponse;
import com.filmticket.dto.SeatResponse;
import com.filmticket.dto.UpdateSeatRequest;
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
@RequestMapping("/api/admin/rooms")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminCinemaRoomController {

    private final CinemaRoomService cinemaRoomService;
    private final SeatService seatService;

    @Operation(summary = "List all rooms")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CinemaRoomResponse>>> getAllRooms() {
        return ResponseEntity.ok(ApiResponse.success(
                "Rooms fetched successfully",
                cinemaRoomService.getAllRooms()
        ));
    }

    @Operation(summary = "Get room by ID")
    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> getRoomById(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Room fetched successfully",
                cinemaRoomService.getRoomById(roomId)
        ));
    }

    @Operation(summary = "Create a cinema room")
    @PostMapping
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> createRoom(
            @Valid @RequestBody CinemaRoomRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cinema room created successfully", 
                        cinemaRoomService.createRoomAndGenerateSeats(request)));
    }

    @Operation(summary = "Update a cinema room")
    @PutMapping("/{roomId}")
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> updateRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody CinemaRoomUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cinema room updated successfully",
                cinemaRoomService.updateRoom(roomId, request)
        ));
    }

    @Operation(summary = "Delete a cinema room (soft delete)")
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable UUID roomId) {
        cinemaRoomService.deleteRoom(roomId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get seat map summary for a room")
    @GetMapping("/{roomId}/seat-map")
    public ResponseEntity<ApiResponse<SeatMapResponse>> getSeatMap(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Seat map fetched successfully",
                seatService.getSeatMap(roomId)
        ));
    }

    @Operation(summary = "List seats by room")
    @GetMapping("/{roomId}/seats")
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

    @Operation(summary = "Update a seat (full update)")
    @PutMapping("/seats/{id}")
    public ResponseEntity<ApiResponse<SeatResponse>> updateSeat(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertSeatRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Seat updated successfully", seatService.updateSeat(id, request)));
    }

    @Operation(summary = "Update seat type and status")
    @PatchMapping("/seats/{id}")
    public ResponseEntity<ApiResponse<SeatResponse>> updateSeatTypeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSeatRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Seat type and status updated successfully", 
                seatService.updateSeatTypeStatus(id, request)));
    }

    @Operation(summary = "Delete a seat")
    @DeleteMapping("/seats/{id}")
    public ResponseEntity<Void> deleteSeat(@PathVariable UUID id) {
        seatService.deleteSeat(id);
        return ResponseEntity.noContent().build();
    }
}
