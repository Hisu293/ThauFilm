package com.filmticket.service;

import com.filmticket.client.SensitiveGatewayClient;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OutboundEmailService {
    private final JavaMailSender localMailSender;
    private final SensitiveGatewayClient sensitiveGatewayClient;

    @Value("${app.mail.transport:LOCAL}")
    private String transport;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String from;

    public void send(String messageId, String to, String subject, String body,
                     boolean html, List<Attachment> attachments) throws Exception {
        List<Attachment> safeAttachments = attachments == null ? List.of() : attachments;
        if ("GATEWAY".equalsIgnoreCase(transport)) {
            if (!sensitiveGatewayClient.isConfigured()) {
                throw new IllegalStateException("MAIL_TRANSPORT=GATEWAY nhưng sensitive gateway chưa được cấu hình");
            }
            List<SensitiveGatewayClient.EmailAttachment> gatewayAttachments = safeAttachments.stream()
                    .map(attachment -> new SensitiveGatewayClient.EmailAttachment(
                            attachment.filename(), attachment.contentType(),
                            Base64.getEncoder().encodeToString(attachment.content())))
                    .toList();
            sensitiveGatewayClient.sendEmail(messageId, to, subject, body, html, gatewayAttachments);
            return;
        }

        MimeMessage message = localMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, !safeAttachments.isEmpty(), "UTF-8");
        if (from != null && !from.isBlank()) helper.setFrom(from);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, html);
        for (Attachment attachment : safeAttachments) {
            helper.addAttachment(attachment.filename(), new ByteArrayResource(attachment.content()),
                    attachment.contentType());
        }
        localMailSender.send(message);
    }

    public record Attachment(String filename, String contentType, byte[] content) {}
}
