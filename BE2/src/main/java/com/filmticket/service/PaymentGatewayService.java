package com.filmticket.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
import com.filmticket.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${payos.client-id:}")
    private String payosClientId;

    @Value("${payos.api-key:}")
    private String payosApiKey;

    @Value("${payos.checksum-key:}")
    private String payosChecksumKey;

    public GatewayPayment createGatewayPayment(String provider, Payment payment, String description) {
        String normalizedProvider = normalizeProvider(provider);
        return switch (normalizedProvider) {
            case "PAYOS" -> createPayosLink(payment, description);
            default -> throw new BadRequestException("Unsupported payment provider: " + provider);
        };
    }

    public GatewayRefund refund(Payment payment, String reason) {
        String provider = normalizeProvider(payment.getProvider());
        if ("PAYOS".equals(provider)) {
            return new GatewayRefund(null, PaymentStatus.REFUND_PENDING,
                    "PayOS/VietQR refund must be processed manually or through your bank/provider dashboard");
        }
        return new GatewayRefund("mock-" + UUID.randomUUID(), PaymentStatus.REFUNDED, null);
    }

    public PayosWebhookResult parsePayosWebhook(String payload) {
        try {
            Map<String, Object> body = objectMapper.readValue(payload, new TypeReference<>() {});
            Object dataObj = body.get("data");
            if (!(dataObj instanceof Map<?, ?> data)) {
                throw new BadRequestException("Invalid PayOS webhook payload");
            }

            String expectedSignature = signPayosData(data);
            String receivedSignature = Objects.toString(body.get("signature"), "");
            if (payosChecksumKey != null && !payosChecksumKey.isBlank()
                    && !expectedSignature.equalsIgnoreCase(receivedSignature)) {
                throw new BadRequestException("Invalid PayOS webhook signature");
            }

            String code = Objects.toString(data.get("code"), Objects.toString(body.get("code"), ""));
            boolean paid = "00".equals(code) || "PAID".equalsIgnoreCase(Objects.toString(data.get("status"), ""));
            String orderCode = Objects.toString(data.get("orderCode"), "");
            String paymentId = Objects.toString(data.get("paymentLinkId"), orderCode);
            return new PayosWebhookResult(paid, orderCode, paymentId);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Cannot parse PayOS webhook payload");
        }
    }

    private GatewayPayment createPayosLink(Payment payment, String description) {
        if (payosClientId == null || payosClientId.isBlank()
                || payosApiKey == null || payosApiKey.isBlank()
                || payosChecksumKey == null || payosChecksumKey.isBlank()) {
            throw new BadRequestException("PayOS credentials are not configured");
        }
        try {
            long orderCode = Math.abs(payment.getId().getMostSignificantBits());
            int amount = payment.getAmount().setScale(0, RoundingMode.HALF_UP).intValueExact();
            String safeDescription = ascii(description);
            if (safeDescription.length() > 25) {
                safeDescription = safeDescription.substring(0, 25);
            }

            Map<String, Object> request = new LinkedHashMap<>();
            request.put("orderCode", orderCode);
            request.put("amount", amount);
            request.put("description", safeDescription);
            request.put("returnUrl", frontendUrl + "/my-bookings?payment=success&bookingId=" + payment.getBookingId());
            request.put("cancelUrl", frontendUrl + "/booking/payment?payment=cancelled&bookingId=" + payment.getBookingId());
            request.put("signature", signPayosCreateRequest(request));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", payosClientId);
            headers.set("x-api-key", payosApiKey);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    "https://api-merchant.payos.vn/v2/payment-requests",
                    new HttpEntity<>(request, headers),
                    Map.class
            );

            if (response == null || !"00".equals(Objects.toString(response.get("code"), ""))) {
                throw new BadRequestException("PayOS rejected payment request: " + response);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            String checkoutUrl = Objects.toString(data.get("checkoutUrl"), "");
            String qrCode = Objects.toString(data.get("qrCode"), "");
            String paymentLinkId = Objects.toString(data.get("paymentLinkId"), String.valueOf(orderCode));
            return new GatewayPayment("PAYOS", String.valueOf(orderCode), paymentLinkId, checkoutUrl, qrCode);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Cannot create PayOS payment link: " + ex.getMessage());
        }
    }

    private String signPayosCreateRequest(Map<String, Object> request) {
        String raw = "amount=" + request.get("amount")
                + "&cancelUrl=" + request.get("cancelUrl")
                + "&description=" + request.get("description")
                + "&orderCode=" + request.get("orderCode")
                + "&returnUrl=" + request.get("returnUrl");
        return hmacSha256(raw, payosChecksumKey);
    }

    private String signPayosData(Map<?, ?> data) {
        TreeMap<String, String> sorted = new TreeMap<>();
        data.forEach((key, value) -> {
            if (value != null) {
                sorted.put(String.valueOf(key), String.valueOf(value));
            }
        });
        String raw = String.join("&", sorted.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .toList());
        return hmacSha256(raw, payosChecksumKey);
    }

    private String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (Exception ex) {
            throw new BadRequestException("Cannot sign PayOS payload");
        }
    }

    private String normalizeProvider(String provider) {
        String normalized = String.valueOf(provider == null ? "" : provider).trim().toUpperCase(Locale.ROOT);
        return "VIETQR".equals(normalized) ? "PAYOS" : normalized;
    }

    private String ascii(String value) {
        String normalized = Normalizer.normalize(String.valueOf(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    public record GatewayPayment(String provider, String checkoutId, String paymentId, String checkoutUrl, String qrCode) {}
    public record GatewayRefund(String refundId, PaymentStatus status, String failureReason) {}
    public record PayosWebhookResult(boolean paid, String orderCode, String paymentId) {}
}
