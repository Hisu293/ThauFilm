package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.BookingService;
import com.filmticket.service.PaymentGatewayService;
import com.filmticket.service.GroupBookingService;
import com.filmticket.service.WatchPartyService;
import com.filmticket.service.AuditAction;
import com.filmticket.service.AuditLogService;
import com.filmticket.entity.AuditLog;
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
    private final GroupBookingService groupBookingService;
    private final WatchPartyService watchPartyService;
    private final AuditLogService auditLogService;

    @GetMapping("/payos")
    public ResponseEntity<ApiResponse<?>> payosHealth() {
        return ResponseEntity.ok(ApiResponse.success("PayOS webhook is ready", null));
    }

    @PostMapping(value = "/payos", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> payos(@RequestBody(required = false) String payload) {
        handlePayosPayload(payload);
        return ResponseEntity.ok("OK");
    }

    @GetMapping(value = "/payos-webhook", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> payosWebhookHealth() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping(value = "/payos-webhook", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> payosWebhook(@RequestBody(required = false) String payload) {
        handlePayosPayload(payload);
        return ResponseEntity.ok("OK");
    }

    private void handlePayosPayload(String payload) {
        try {
            PaymentGatewayService.PayosWebhookResult result = paymentGatewayService.parsePayosWebhook(payload);
            if (result.paid()) {
                auditLogService.success(AuditLogService.AuditCommand.builder()
                        .action(AuditAction.PAYMENT_WEBHOOK_RECEIVED).actorType(AuditLog.ActorType.WEBHOOK)
                        .source(AuditLog.AuditSource.PAYOS_WEBHOOK).targetType("PAYMENT")
                        .targetId(result.paymentId()).providerEventId(result.paymentId())
                        .correlationId(result.orderCode()).description("Đã tiếp nhận webhook thanh toán PayOS hợp lệ")
                        .sensitive(true).build());
                if (groupBookingService.confirmPayosPaymentIfGroup(result.orderCode(), result.paymentId())) {
                    return;
                }
                try {
                    bookingService.confirmPayosPayment(result.orderCode(), result.paymentId());
                } catch (Exception bookingPaymentNotFound) {
                    watchPartyService.confirmPayosPayment(result.orderCode(), result.paymentId());
                }
            }
        } catch (Exception ignored) {
            // PayOS verifies webhook availability with non-payment payloads.
            // Always return 200 so the channel can be saved; real payment failures are logged upstream.
        }
    }
}
