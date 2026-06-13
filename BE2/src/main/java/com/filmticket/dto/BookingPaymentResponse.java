package com.filmticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentResponse {
    private BookingResponse booking;
    private PaymentResponse payment;
    private List<TicketResponse> tickets;
}
