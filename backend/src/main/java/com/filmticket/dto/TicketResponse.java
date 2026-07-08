package com.filmticket.dto;

import com.filmticket.entity.Ticket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private UUID id;
    private UUID bookingId;
    private UUID seatId;
    private String ticketCode;
    private boolean checkedIn;
    private LocalDateTime createdAt;
    private String confirmationCode;
    private String bookingStatus;

    // Customer info
    private String customerName;
    private String customerEmail;
    private String customerPhone;

    // Showtime info
    private UUID showtimeId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // Movie info
    private UUID movieId;
    private String movieTitle;

    // Room info
    private UUID cinemaRoomId;
    private String cinemaRoomName;

    // Theater info
    private UUID theaterId;
    private String theaterName;

    // Seat info
    private String seatLabel;
    private String seatType;

    // Price
    private BigDecimal price;

    // Payment info
    private String paymentMethod;
    private String paymentStatus;
    private BigDecimal paymentAmount;
    private String transactionId;
    private LocalDateTime paidAt;

    public static TicketResponse fromTicket(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .bookingId(ticket.getBookingId())
                .seatId(ticket.getSeatId())
                .ticketCode(ticket.getTicketCode())
                .checkedIn(ticket.isCheckedIn())
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
