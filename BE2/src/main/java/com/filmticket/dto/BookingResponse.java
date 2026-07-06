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
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private UUID showtimeId;
    private String movieTitle;
    private UUID cinemaRoomId;
    private String cinemaRoomName;
    private UUID theaterId;
    private String theaterName;
    private LocalDateTime startTime;
    private BigDecimal totalAmount;
    private String status;
    private Boolean accessGranted;
    private String confirmationCode;
    private LocalDateTime createdAt;
    private LocalDateTime holdExpiresAt;
    private LocalDateTime confirmedAt;
    private List<ShowtimeSeatResponse> seats;

    // Payment info
    private String paymentMethod;
    private String paymentStatus;
    private java.math.BigDecimal paymentAmount;

    public static BookingResponse fromBooking(Booking booking, List<ShowtimeSeatResponse> seats) {
        return fromBooking(booking, seats, null, null);
    }

    public static BookingResponse fromBooking(Booking booking, List<ShowtimeSeatResponse> seats,
            String movieTitle, String cinemaRoomName) {
        return BookingResponse.builder()
                .id(booking.getId())
                .userId(booking.getUserId())
                .showtimeId(booking.getShowtimeId())
                .movieTitle(movieTitle)
                .cinemaRoomName(cinemaRoomName)
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus().name())
                .accessGranted("CONFIRMED".equals(booking.getStatus().name()))
                .confirmationCode(booking.getConfirmationCode())
                .createdAt(booking.getCreatedAt())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .confirmedAt(booking.getConfirmedAt())
                .seats(seats)
                .build();
    }
}
