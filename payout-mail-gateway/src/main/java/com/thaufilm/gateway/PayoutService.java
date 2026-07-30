package com.thaufilm.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;

@Service
public class PayoutService {
    private static final String PAYOUT_URL = "https://api-merchant.payos.vn/v1/payouts";
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${payos.payout.client-id:}")
    private String clientId;
    @Value("${payos.payout.api-key:}")
    private String apiKey;
    @Value("${payos.payout.checksum-key:}")
    private String checksumKey;

    public PayoutService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public PayoutResponse create(PayoutRequest request) {
        requireConfiguration();
        validate(request);
        Map<String, Object> payload = new TreeMap<>();
        payload.put("amount", request.amount());
        payload.put("description", request.description());
        payload.put("referenceId", request.referenceId());
        payload.put("toAccountNumber", request.toAccountNumber());
        payload.put("toBin", request.toBin());

        HttpHeaders headers = headers();
        headers.set("x-idempotency-key", request.referenceId());
        headers.set("x-signature", sign(payload));
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    PAYOUT_URL, new HttpEntity<>(payload, headers), String.class);
            return parse(response.getBody(), null);
        } catch (HttpStatusCodeException ex) {
            throw providerError(ex);
        }
    }

    public PayoutResponse status(String payoutId) {
        requireConfiguration();
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    PAYOUT_URL + "/" + payoutId, HttpMethod.GET,
                    new HttpEntity<>(headers()), String.class);
            return parse(response.getBody(), payoutId);
        } catch (HttpStatusCodeException ex) {
            throw providerError(ex);
        }
    }

    private PayoutResponse parse(String responseJson, String fallbackId) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            if (!"00".equals(root.path("code").asText())) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "PayOS: " + root.path("desc").asText("unknown error"));
            }
            JsonNode data = root.path("data");
            String id = data.path("id").asText(fallbackId);
            String state = data.path("transactions").path(0).path("state")
                    .asText(data.path("approvalState").asText("PROCESSING"));
            if (id == null || id.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayOS response has no payout id");
            }
            return new PayoutResponse(id, state, responseJson);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid PayOS response");
        }
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        return headers;
    }

    private String sign(Map<String, Object> data) {
        String raw = data.entrySet().stream()
                .map(entry -> entry.getKey() + "="
                        + UriUtils.encode(String.valueOf(entry.getValue()), StandardCharsets.UTF_8))
                .reduce((left, right) -> left + "&" + right).orElse("");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksumKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot sign PayOS payout");
        }
    }

    private ResponseStatusException providerError(HttpStatusCodeException ex) {
        String body = ex.getResponseBodyAsString();
        String detail = body;
        try {
            JsonNode root = objectMapper.readTree(body);
            detail = root.path("desc").asText(root.path("message").asText(body));
        } catch (Exception ignored) {
            // Use bounded raw response below.
        }
        if (detail == null || detail.isBlank()) detail = "empty response";
        detail = detail.substring(0, Math.min(300, detail.length()));
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "PayOS HTTP " + ex.getStatusCode().value() + ": " + detail);
    }

    private void requireConfiguration() {
        if (blank(clientId) || blank(apiKey) || blank(checksumKey)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "PayOS payout credentials are not configured");
        }
    }

    private void validate(PayoutRequest request) {
        if (request == null || blank(request.referenceId()) || request.amount() <= 0
                || blank(request.description()) || blank(request.toBin())
                || blank(request.toAccountNumber())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payout request");
        }
        if (!request.toBin().matches("\\d{6}") || !request.toAccountNumber().matches("\\d{4,25}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid destination bank account");
        }
        if (request.referenceId().length() > 100 || request.description().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payout fields are too long");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record PayoutRequest(String referenceId, int amount, String description,
                                String toBin, String toAccountNumber) {}
    public record PayoutResponse(String payoutId, String state, String responseJson) {}
}
