package com.filmticket.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PayOSRefundClient {
    private static final String PAYOUT_URL = "https://api-merchant.payos.vn/v1/payouts";

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    public PayoutResult refund(String referenceId, BigDecimal amount, String reason,
                               String bankBin, String accountNumber) {
        if (clientId.isBlank() || apiKey.isBlank() || checksumKey.isBlank()) {
            throw new BadRequestException("PayOS chưa được cấu hình đầy đủ để hoàn tiền tự động");
        }

        int amountInVnd;
        try {
            amountInVnd = amount.setScale(0).intValueExact();
        } catch (ArithmeticException ex) {
            throw new BadRequestException("Số tiền hoàn không hợp lệ");
        }

        String description = normalizeDescription(reason);
        Map<String, Object> payload = new TreeMap<>();
        payload.put("amount", amountInVnd);
        payload.put("description", description);
        payload.put("referenceId", referenceId);
        payload.put("toAccountNumber", accountNumber);
        payload.put("toBin", bankBin);

        long startedAt = System.currentTimeMillis();
        String responseJson = null;
        try {
            String signature = sign(payload);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);
            headers.set("x-idempotency-key", referenceId);
            headers.set("x-signature", signature);

            var response = restTemplate.postForEntity(PAYOUT_URL, new HttpEntity<>(payload, headers), String.class);
            responseJson = response.getBody();
            log.info("Hoàn tiền PayOS: referenceId={}, amount={}, thời gian={}ms, response={} ",
                    referenceId, amountInVnd, System.currentTimeMillis() - startedAt, responseJson);

            if (!response.getStatusCode().is2xxSuccessful() || responseJson == null) {
                throw new BadRequestException("PayOS từ chối lệnh hoàn tiền");
            }
            JsonNode root = objectMapper.readTree(responseJson);
            if (!"00".equals(root.path("code").asText())) {
                throw new BadRequestException("PayOS không tạo được lệnh hoàn tiền: " + root.path("desc").asText());
            }
            JsonNode data = root.path("data");
            String payoutId = data.path("id").asText(null);
            String state = data.path("transactions").path(0).path("state").asText(
                    data.path("approvalState").asText("PROCESSING"));
            if (payoutId == null || payoutId.isBlank()) {
                throw new BadRequestException("PayOS trả về mã hoàn tiền không hợp lệ");
            }
            return new PayoutResult(payoutId, state, responseJson);
        } catch (BadRequestException ex) {
            log.error("Hoàn tiền PayOS thất bại: referenceId={}, amount={}, response={}, lỗi={}",
                    referenceId, amountInVnd, responseJson, ex.getMessage(), ex);
            throw ex;
        } catch (Exception ex) {
            log.error("Lỗi kết nối PayOS khi hoàn tiền: referenceId={}, amount={}, response={}",
                    referenceId, amountInVnd, responseJson, ex);
            throw new BadRequestException("Không thể kết nối PayOS để hoàn tiền");
        }
    }

    public PayoutResult getStatus(String payoutId) {
        if (payoutId == null || payoutId.isBlank()) {
            throw new BadRequestException("Mã lệnh hoàn tiền PayOS không hợp lệ");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);
            var response = restTemplate.exchange(PAYOUT_URL + "/" + payoutId,
                    HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String responseJson = response.getBody();
            JsonNode root = responseJson == null ? null : objectMapper.readTree(responseJson);
            if (root == null || !"00".equals(root.path("code").asText())) {
                throw new BadRequestException("Không lấy được trạng thái lệnh hoàn tiền PayOS");
            }
            JsonNode data = root.path("data");
            String state = data.path("transactions").path(0).path("state").asText(
                    data.path("approvalState").asText("PROCESSING"));
            return new PayoutResult(data.path("id").asText(payoutId), state, responseJson);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Không thể kiểm tra trạng thái hoàn tiền PayOS");
        }
    }

    private String sign(Map<String, Object> data) {
        String raw = data.entrySet().stream()
                .map(entry -> UriUtils.encode(entry.getKey(), StandardCharsets.UTF_8)
                        + "=" + UriUtils.encode(String.valueOf(entry.getValue()), StandardCharsets.UTF_8))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksumKey.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            StringBuilder result = new StringBuilder();
            for (byte value : mac.doFinal(raw.getBytes(StandardCharsets.UTF_8))) {
                result.append(String.format("%02x", value));
            }
            return result.toString();
        } catch (Exception ex) {
            throw new BadRequestException("Không thể tạo chữ ký hoàn tiền PayOS");
        }
    }

    private String normalizeDescription(String reason) {
        String value = reason == null ? "Hoan tien ve xem phim" : reason.trim();
        value = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^A-Za-z0-9 ]", " ")
                .replaceAll("\\s+", " ").trim();
        return (value.isBlank() ? "Hoan tien ve xem phim" : value).substring(0,
                Math.min(100, (value.isBlank() ? "Hoan tien ve xem phim" : value).length()));
    }

    public record PayoutResult(String payoutId, String state, String responseJson) {
        public boolean succeeded() { return "SUCCEEDED".equalsIgnoreCase(state) || "COMPLETED".equalsIgnoreCase(state); }
        public boolean processing() { return "PROCESSING".equalsIgnoreCase(state) || "PENDING".equalsIgnoreCase(state); }
    }
}
