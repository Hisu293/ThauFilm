package com.thaufilm.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/v1/emails")
public class EmailController {
    private final GatewayAuthService authService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public EmailController(GatewayAuthService authService, EmailService emailService,
                           ObjectMapper objectMapper) {
        this.authService = authService;
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public EmailService.EmailResponse send(
            HttpServletRequest servletRequest,
            @RequestHeader("X-Gateway-Timestamp") String timestamp,
            @RequestHeader("X-Gateway-Nonce") String nonce,
            @RequestHeader("X-Gateway-Signature") String signature,
            @RequestBody String rawBody) throws Exception {
        authService.verify("POST", servletRequest.getRequestURI(), rawBody, timestamp, nonce, signature);
        return emailService.send(objectMapper.readValue(rawBody, EmailService.EmailRequest.class));
    }
}
