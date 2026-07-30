package com.filmticket.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SensitiveGatewayClient {
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${sensitive.gateway.url:}")
    private String baseUrl;

    @Value("${sensitive.gateway.shared-secret:}")
    private String sharedSecret;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank()
                && sharedSecret != null && sharedSecret.length() >= 32;
    }

    public GatewayPayout createPayout(String referenceId, int amount, String description,
                                      String toBin, String toAccountNumber) {
        String path = "/internal/v1/payouts";
        String body = writeJson(new CreatePayoutRequest(
                referenceId, amount, description, toBin, toAccountNumber));
        JsonNode data = exchange(HttpMethod.POST, path, body);
        return new GatewayPayout(
                data.path("payoutId").asText(null),
                data.path("state").asText("PROCESSING"),
                data.path("responseJson").asText(null));
    }

    public GatewayPayout getPayout(String payoutId) {
        String path = "/internal/v1/payouts/" + payoutId;
        JsonNode data = exchange(HttpMethod.GET, path, "");
        return new GatewayPayout(
                data.path("payoutId").asText(payoutId),
                data.path("state").asText("PROCESSING"),
                data.path("responseJson").asText(null));
    }

    public void sendEmail(String messageId, String to, String subject, String body,
                          boolean html, List<EmailAttachment> attachments) {
        String path = "/internal/v1/emails";
        String requestBody = writeJson(new EmailRequest(
                messageId, to, subject, body, html,
                attachments == null ? List.of() : attachments));
        exchange(HttpMethod.POST, path, requestBody);
    }

    private JsonNode exchange(HttpMethod method, String path, String body) {
        if (!isConfigured()) {
            throw new BadRequestException("Sensitive gateway chưa được cấu hình");
        }
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String timestampValue = String.valueOf(timestamp);
        String canonical = method.name() + "\n" + path + "\n" + timestampValue
                + "\n" + nonce + "\n" + sha256(body);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Gateway-Timestamp", timestampValue);
        headers.set("X-Gateway-Nonce", nonce);
        headers.set("X-Gateway-Signature", hmac(canonical));
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    trimTrailingSlash(baseUrl) + path, method,
                    new HttpEntity<>(body.isEmpty() ? null : body, headers), String.class);
            if (response.getBody() == null) {
                throw new BadRequestException("Sensitive gateway trả về phản hồi rỗng");
            }
            return objectMapper.readTree(response.getBody());
        } catch (HttpStatusCodeException ex) {
            String detail = providerMessage(ex.getResponseBodyAsString());
            throw new BadRequestException("Sensitive gateway HTTP "
                    + ex.getStatusCode().value() + ": " + detail);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Không thể kết nối sensitive gateway trên VPS");
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new BadRequestException("Không thể tạo dữ liệu gửi sensitive gateway");
        }
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(sharedSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BadRequestException("Không thể ký request sensitive gateway");
        }
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256")
                            .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BadRequestException("Không thể hash request sensitive gateway");
        }
    }

    private String providerMessage(String body) {
        if (body == null || body.isBlank()) return "không có nội dung phản hồi";
        try {
            JsonNode root = objectMapper.readTree(body);
            String detail = root.path("detail").asText(root.path("message").asText(""));
            if (!detail.isBlank()) return detail;
        } catch (Exception ignored) {
            // Use a bounded raw response below.
        }
        return body.substring(0, Math.min(300, body.length()));
    }

    private String trimTrailingSlash(String value) {
        String result = value.trim();
        while (result.endsWith("/")) result = result.substring(0, result.length() - 1);
        return result;
    }

    public record CreatePayoutRequest(String referenceId, int amount, String description,
                                      String toBin, String toAccountNumber) {}
    public record GatewayPayout(String payoutId, String state, String responseJson) {}
    public record EmailAttachment(String filename, String contentType, String base64) {}
    public record EmailRequest(String messageId, String to, String subject, String body,
                               boolean html, List<EmailAttachment> attachments) {}
}
