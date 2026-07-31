package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.service.StaffShowtimeService;
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
@RequestMapping("/api/staff/showtimes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class StaffShowtimeController {

    private final StaffShowtimeService staffShowtimeService;

    @Operation(summary = "List all showtimes for staff")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> listShowtimes() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách suất chiếu thành công", staffShowtimeService.listShowtimes()));
    }

    @Operation(summary = "Create a showtime")
    @PostMapping
    public ResponseEntity<ApiResponse<ShowtimeResponse>> createShowtime(@Valid @RequestBody UpsertShowtimeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo suất chiếu thành công", staffShowtimeService.createShowtime(request)));
    }

    @Operation(summary = "Update a showtime")
    @PutMapping("/{showtimeId}")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> updateShowtime(
            @PathVariable UUID showtimeId,
            @Valid @RequestBody UpsertShowtimeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật suất chiếu thành công", staffShowtimeService.updateShowtime(showtimeId, request)));
    }

    @Operation(summary = "Cancel a showtime")
    @DeleteMapping("/{showtimeId}")
    public ResponseEntity<ApiResponse<Void>> cancelShowtime(@PathVariable UUID showtimeId) {
        staffShowtimeService.cancelShowtime(showtimeId);
        return ResponseEntity.ok(ApiResponse.success("Hủy suất chiếu thành công", null));
    }

    @Operation(summary = "Get seat tracking for a showtime")
    @GetMapping("/{showtimeId}/seats")
    public ResponseEntity<ApiResponse<?>> getShowtimeSeats(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy trạng thái ghế của suất chiếu thành công", staffShowtimeService.getShowtimeSeats(showtimeId)));
    }
}
