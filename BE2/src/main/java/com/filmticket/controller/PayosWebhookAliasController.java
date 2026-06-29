package com.filmticket.controller;

import com.filmticket.service.BookingService;
import com.filmticket.service.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PayosWebhookAliasController {

    private final PaymentGatewayService paymentGatewayService;
    private final BookingService bookingService;

    @GetMapping(value = "/payos-webhook", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping(value = "/payos-webhook", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> webhook(@RequestBody(required = false) String payload) {
        try {
            PaymentGatewayService.PayosWebhookResult result = paymentGatewayService.parsePayosWebhook(payload);
            if (result.paid()) {
                bookingService.confirmPayosPayment(result.orderCode(), result.paymentId());
            }
        } catch (Exception ignored) {
            // Keep PayOS webhook verification successful even for non-payment test payloads.
        }
        return ResponseEntity.ok("OK");
    }
}
