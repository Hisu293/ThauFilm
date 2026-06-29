package com.filmticket.dto;

import com.filmticket.entity.Booking;
import com.filmticket.entity.Payment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentResponse {
    private BookingResponse booking;
    private PaymentResponse payment;
    private List<TicketResponse> tickets;
    private BigDecimal originalAmount;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private String discountCode;
    private String checkoutUrl;
    private String qrCode;
    private boolean requiresRedirect;

    public static BookingPaymentResponse fromPaymentResult(Booking booking, Payment payment, List<TicketResponse> tickets,
                                                           BigDecimal originalAmount, BigDecimal discountAmount, String discountCode) {
        return BookingPaymentResponse.builder()
                .booking(BookingResponse.fromBooking(booking, List.of()))
                .payment(PaymentResponse.fromPayment(payment))
                .tickets(tickets)
                .originalAmount(originalAmount)
                .discountAmount(discountAmount)
                .finalAmount(originalAmount.subtract(discountAmount))
                .discountCode(discountCode)
                .checkoutUrl(payment.getCheckoutUrl())
                .qrCode(payment.getQrCode())
                .requiresRedirect(payment.getCheckoutUrl() != null && !payment.getCheckoutUrl().isBlank())
                .build();
    }
}
