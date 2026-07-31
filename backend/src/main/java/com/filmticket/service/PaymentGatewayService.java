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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
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
        String cleanFrontendUrl = trimTrailingSlash(frontendUrl);
        return createGatewayPayment(
                provider,
                payment,
                description,
                cleanFrontendUrl + "/my-bookings/" + payment.getBookingId(),
                cleanFrontendUrl + "/my-bookings/" + payment.getBookingId()
        );
    }

    public GatewayPayment createGatewayPayment(String provider, Payment payment, String description, String returnUrl, String cancelUrl) {
        String normalizedProvider = normalizeProvider(provider);
        String resolvedReturnUrl = resolveFrontendUrl(returnUrl);
        String resolvedCancelUrl = resolveFrontendUrl(cancelUrl);
        return switch (normalizedProvider) {
            case "PAYOS" -> createPayosLink(payment, description, resolvedReturnUrl, resolvedCancelUrl);
            default -> throw new BadRequestException("Cổng thanh toán không được hỗ trợ: " + provider);
        };
    }

    public GatewayRefund refund(Payment payment, String reason) {
        String provider = normalizeProvider(payment.getProvider());
        if ("PAYOS".equals(provider)) {
            return new GatewayRefund(null, PaymentStatus.REFUND_PENDING,
                    "Hoàn tiền PayOS/VietQR cần được xử lý thủ công hoặc qua trang quản trị của ngân hàng/cổng thanh toán");
        }
        return new GatewayRefund("mock-" + UUID.randomUUID(), PaymentStatus.REFUNDED, null);
    }

    public PayosPaymentStatus getPayosPaymentStatus(String orderCode) {
        if (payosClientId == null || payosClientId.isBlank()
                || payosApiKey == null || payosApiKey.isBlank()) {
            throw new BadRequestException("Thông tin kết nối PayOS chưa được cấu hình");
        }
        if (orderCode == null || orderCode.isBlank()) {
            throw new BadRequestException("Mã đơn hàng PayOS là bắt buộc");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-client-id", payosClientId);
            headers.set("x-api-key", payosApiKey);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api-merchant.payos.vn/v2/payment-requests/" + orderCode.trim(),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Map<?, ?> body = response.getBody();
            if (body == null || !"00".equals(Objects.toString(body.get("code"), ""))) {
                return new PayosPaymentStatus(false, orderCode, null);
            }
            Object dataObj = body.get("data");
            if (!(dataObj instanceof Map<?, ?> data)) {
                return new PayosPaymentStatus(false, orderCode, null);
            }
            String status = Objects.toString(data.get("status"), "");
            boolean paid = "PAID".equalsIgnoreCase(status) || "00".equals(Objects.toString(data.get("code"), ""));
            String paymentLinkId = Objects.toString(data.get("paymentLinkId"), orderCode);
            return new PayosPaymentStatus(paid, orderCode, paymentLinkId);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Không thể xác minh giao dịch PayOS: " + ex.getMessage());
        }
    }

    public PayosWebhookResult parsePayosWebhook(String payload) {
        try {
            if (payload == null || payload.isBlank()) {
                return new PayosWebhookResult(false, null, null);
            }
            Map<String, Object> body = objectMapper.readValue(payload, new TypeReference<>() {});
            Object dataObj = body.get("data");
            if (!(dataObj instanceof Map<?, ?> data)) {
                return new PayosWebhookResult(false, null, null);
            }

            String expectedSignature = signPayosData(data);
            String receivedSignature = Objects.toString(body.get("signature"), "");
            if (payosChecksumKey != null && !payosChecksumKey.isBlank()
                    && !expectedSignature.equalsIgnoreCase(receivedSignature)) {
                return new PayosWebhookResult(false, null, null);
            }

            String code = Objects.toString(data.get("code"), Objects.toString(body.get("code"), ""));
            boolean paid = "00".equals(code) || "PAID".equalsIgnoreCase(Objects.toString(data.get("status"), ""));
            String orderCode = Objects.toString(data.get("orderCode"), "");
            String paymentId = Objects.toString(data.get("paymentLinkId"), orderCode);
            return new PayosWebhookResult(paid, orderCode, paymentId);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            return new PayosWebhookResult(false, null, null);
        }
    }

    private GatewayPayment createPayosLink(Payment payment, String description, String returnUrl, String cancelUrl) {
        if (payosClientId == null || payosClientId.isBlank()
                || payosApiKey == null || payosApiKey.isBlank()
                || payosChecksumKey == null || payosChecksumKey.isBlank()) {
            throw new BadRequestException("Thông tin kết nối PayOS chưa được cấu hình");
        }
        try {
            long orderCode = Math.abs(payment.getId().getMostSignificantBits() % 1_000_000_000_000L);
            if (orderCode < 100_000L) {
                orderCode += 100_000L;
            }
            int amount = payment.getAmount().setScale(0, RoundingMode.HALF_UP).intValueExact();
            String safeDescription = ascii(description);
            if (safeDescription.length() > 25) {
                safeDescription = safeDescription.substring(0, 25);
            }
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("orderCode", orderCode);
            request.put("amount", amount);
            request.put("description", safeDescription);
            request.put("returnUrl", returnUrl);
            request.put("cancelUrl", cancelUrl);
            request.put("signature", signPayosCreateRequest(amount, cancelUrl, safeDescription, orderCode, returnUrl));

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
                throw new BadRequestException("PayOS từ chối yêu cầu thanh toán: " + response);
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
            throw new BadRequestException("Không thể tạo liên kết thanh toán PayOS: " + ex.getMessage());
        }
    }

    private String signPayosCreateRequest(int amount, String cancelUrl, String description, long orderCode, String returnUrl) {
        String raw = "amount=" + amount
                + "&cancelUrl=" + cancelUrl
                + "&description=" + description
                + "&orderCode=" + orderCode
                + "&returnUrl=" + returnUrl;
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
            mac.init(new SecretKeySpec(key.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
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

    private String trimTrailingSlash(String value) {
        String normalized = String.valueOf(value == null ? "" : value).trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.isBlank() ? "http://localhost:5173" : normalized;
    }

    private String resolveFrontendUrl(String value) {
        String normalized = String.valueOf(value == null ? "" : value).trim();
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            return normalized;
        }
        if (!normalized.startsWith("/")) normalized = "/" + normalized;
        return trimTrailingSlash(frontendUrl) + normalized;
    }

    public record GatewayPayment(String provider, String checkoutId, String paymentId, String checkoutUrl, String qrCode) {}
    public record GatewayRefund(String refundId, PaymentStatus status, String failureReason) {}
    public record PayosWebhookResult(boolean paid, String orderCode, String paymentId) {}
    public record PayosPaymentStatus(boolean paid, String orderCode, String paymentId) {}
}
