package com.filmticket.dto;

import com.filmticket.entity.Ticket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    public static TicketResponse fromTicket(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .bookingId(ticket.getBooking().getId())
                .seatId(ticket.getSeatId())
                .ticketCode(ticket.getTicketCode())
                .checkedIn(ticket.isCheckedIn())
                .build();
    }
}
