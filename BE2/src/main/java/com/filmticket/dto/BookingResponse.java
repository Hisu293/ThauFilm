package com.filmticket.dto;

import com.filmticket.entity.Booking;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private UUID id;
    private UUID userId;
    private UUID showtimeId;
    private String movieTitle;
    private String cinemaRoomName;
    private LocalDateTime startTime;
    private BigDecimal totalAmount;
    private String status;
    private String confirmationCode;
    private LocalDateTime holdExpiresAt;
    private LocalDateTime confirmedAt;
    private List<ShowtimeSeatResponse> seats;

    public static BookingResponse fromBooking(Booking booking, List<ShowtimeSeatResponse> seats) {
        return BookingResponse.builder()
                .id(booking.getId())
                .userId(booking.getUserId())
                .showtimeId(booking.getShowtimeId())
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus().name())
                .confirmationCode(booking.getConfirmationCode())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .confirmedAt(booking.getConfirmedAt())
                .seats(seats)
                .build();
    }
}
