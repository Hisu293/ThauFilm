package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.BookingService;
import com.filmticket.service.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/webhooks")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentGatewayService paymentGatewayService;
    private final BookingService bookingService;

    @GetMapping("/payos")
    public ResponseEntity<ApiResponse<?>> payosHealth() {
        return ResponseEntity.ok(ApiResponse.success("PayOS webhook is ready", null));
    }

    @PostMapping(value = "/payos", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> payos(@RequestBody(required = false) String payload) {
        try {
            PaymentGatewayService.PayosWebhookResult result = paymentGatewayService.parsePayosWebhook(payload);
            if (result.paid()) {
                bookingService.confirmPayosPayment(result.orderCode(), result.paymentId());
            }
        } catch (Exception ignored) {
            // PayOS verifies webhook availability with non-payment payloads.
            // Always return 200 so the channel can be saved; real payment failures are logged upstream.
        }
        return ResponseEntity.ok("OK");
    }
}
