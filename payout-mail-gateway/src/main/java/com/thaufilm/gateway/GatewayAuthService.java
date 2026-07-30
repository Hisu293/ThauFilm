package com.thaufilm.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GatewayAuthService {
    private final Map<String, Long> usedNonces = new ConcurrentHashMap<>();

    @Value("${gateway.shared-secret:}")
    private String sharedSecret;

    @Value("${gateway.auth.max-clock-skew-seconds:300}")
    private long maxClockSkewSeconds;

    public void verify(String method, String path, String body,
                       String timestampValue, String nonce, String signature) {
        if (sharedSecret == null || sharedSecret.length() < 32) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gateway shared secret is not configured");
        }
        if (blank(timestampValue) || blank(nonce) || blank(signature)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing gateway authentication");
        }
        long timestamp;
        try {
            timestamp = Long.parseLong(timestampValue);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid gateway timestamp");
        }
        long now = Instant.now().getEpochSecond();
        if (Math.abs(now - timestamp) > maxClockSkewSeconds) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Expired gateway request");
        }
        usedNonces.entrySet().removeIf(entry -> entry.getValue() < now - maxClockSkewSeconds);
        if (usedNonces.putIfAbsent(nonce, timestamp) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Gateway nonce was already used");
        }
        String canonical = method.toUpperCase() + "\n" + path + "\n" + timestampValue
                + "\n" + nonce + "\n" + sha256(body == null ? "" : body);
        String expected = hmac(canonical);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                signature.getBytes(StandardCharsets.US_ASCII))) {
            usedNonces.remove(nonce);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid gateway signature");
        }
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(sharedSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot verify gateway signature");
        }
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot hash gateway request");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
