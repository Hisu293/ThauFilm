package com.filmticket.dto;

import com.filmticket.entity.RefundRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class RefundRequestDto {
    private UUID id;
    private UUID bookingId;
    private String bookingCode;
    private String ticketCode;
    private UUID customerId;
    private String customerName;
    private String customerEmail;
    private UUID staffId;
    private String staffName;
    private String movieTitle;
    private BigDecimal amount;
    private String reason;
    private String rejectionReason;
    private RefundRequestStatus status;
    private boolean requiresAdmin;
    private boolean ticketCheckedIn;
    private LocalDateTime showtimeStart;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime reviewedAt;
}
