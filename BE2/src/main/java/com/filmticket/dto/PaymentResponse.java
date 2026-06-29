package com.filmticket.dto;

import com.filmticket.entity.Payment;
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
public class PaymentResponse {
    private UUID id;
    private UUID bookingId;
    private BigDecimal amount;
    private String paymentMethod;
    private String provider;
    private String status;
    private String transactionId;
    private String checkoutUrl;
    private String qrCode;
    private String providerRefundId;
    private String refundReason;
    private String refundFailedReason;
    private LocalDateTime paidAt;
    private LocalDateTime refundedAt;

    public static PaymentResponse fromPayment(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .bookingId(payment.getBookingId())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .provider(payment.getProvider())
                .status(payment.getStatus().name())
                .transactionId(payment.getTransactionId())
                .checkoutUrl(payment.getCheckoutUrl())
                .qrCode(payment.getQrCode())
                .providerRefundId(payment.getProviderRefundId())
                .refundReason(payment.getRefundReason())
                .refundFailedReason(payment.getRefundFailedReason())
                .paidAt(payment.getPaidAt())
                .refundedAt(payment.getRefundedAt())
                .build();
    }
}
