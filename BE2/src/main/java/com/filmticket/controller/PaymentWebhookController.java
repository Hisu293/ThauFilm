package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.BookingService;
import com.filmticket.service.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/webhooks")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentGatewayService paymentGatewayService;
    private final BookingService bookingService;

    @PostMapping("/payos")
    public ResponseEntity<ApiResponse<?>> payos(@RequestBody String payload) {
        PaymentGatewayService.PayosWebhookResult result = paymentGatewayService.parsePayosWebhook(payload);
        if (result.paid()) {
            bookingService.confirmPayosPayment(result.orderCode(), result.paymentId());
        }
        return ResponseEntity.ok(ApiResponse.success("PayOS webhook processed", null));
    }
}
