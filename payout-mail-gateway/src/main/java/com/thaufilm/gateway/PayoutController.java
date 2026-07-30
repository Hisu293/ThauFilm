package com.thaufilm.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/v1/payouts")
public class PayoutController {
    private final GatewayAuthService authService;
    private final PayoutService payoutService;
    private final ObjectMapper objectMapper;

    public PayoutController(GatewayAuthService authService, PayoutService payoutService,
                            ObjectMapper objectMapper) {
        this.authService = authService;
        this.payoutService = payoutService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public PayoutService.PayoutResponse create(
            HttpServletRequest servletRequest,
            @RequestHeader("X-Gateway-Timestamp") String timestamp,
            @RequestHeader("X-Gateway-Nonce") String nonce,
            @RequestHeader("X-Gateway-Signature") String signature,
            @RequestBody String rawBody) throws Exception {
        authService.verify("POST", servletRequest.getRequestURI(), rawBody, timestamp, nonce, signature);
        return payoutService.create(objectMapper.readValue(rawBody, PayoutService.PayoutRequest.class));
    }

    @GetMapping("/{payoutId}")
    public PayoutService.PayoutResponse status(
            HttpServletRequest servletRequest,
            @RequestHeader("X-Gateway-Timestamp") String timestamp,
            @RequestHeader("X-Gateway-Nonce") String nonce,
            @RequestHeader("X-Gateway-Signature") String signature,
            @PathVariable String payoutId) {
        authService.verify("GET", servletRequest.getRequestURI(), "", timestamp, nonce, signature);
        return payoutService.status(payoutId);
    }
}
