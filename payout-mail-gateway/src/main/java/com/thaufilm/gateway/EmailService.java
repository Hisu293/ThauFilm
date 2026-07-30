package com.thaufilm.gateway;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailService {
    private static final int MAX_ATTACHMENTS = 5;
    private static final int MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
    private final Set<String> sentMessageIds = ConcurrentHashMap.newKeySet();
    private final JavaMailSender mailSender;

    @Value("${gateway.mail.from:}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public EmailResponse send(EmailRequest request) {
        if (blank(request.messageId()) || blank(request.to()) || blank(request.subject())
                || request.body() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email request");
        }
        if (sentMessageIds.contains(request.messageId())) {
            return new EmailResponse(request.messageId(), true);
        }
        List<Attachment> attachments = request.attachments() == null ? List.of() : request.attachments();
        if (attachments.size() > MAX_ATTACHMENTS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Too many attachments");
        }
        int totalBytes = 0;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, !attachments.isEmpty(), "UTF-8");
            if (!blank(from)) helper.setFrom(from);
            helper.setTo(request.to());
            helper.setSubject(request.subject());
            helper.setText(request.body(), request.html());
            for (Attachment attachment : attachments) {
                byte[] content = Base64.getDecoder().decode(attachment.base64());
                totalBytes += content.length;
                if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
                    throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                            "Email attachments exceed 10 MB");
                }
                helper.addAttachment(attachment.filename(), new ByteArrayResource(content),
                        blank(attachment.contentType()) ? "application/octet-stream" : attachment.contentType());
            }
            mailSender.send(message);
            sentMessageIds.add(request.messageId());
            return new EmailResponse(request.messageId(), false);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gmail SMTP delivery failed");
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record Attachment(String filename, String contentType, String base64) {}
    public record EmailRequest(String messageId, String to, String subject, String body,
                               boolean html, List<Attachment> attachments) {}
    public record EmailResponse(String messageId, boolean duplicate) {}
}
