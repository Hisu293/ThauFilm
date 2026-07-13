package com.filmticket.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class GroupBookingDto {
    private GroupBookingDto() {}

    @Data
    public static class SelectSeatsRequest {
        @NotEmpty @Size(min = 1, max = 2) private List<UUID> seatIds;
    }

    @Data @Builder
    public static class MemberResponse {
        private UUID userId;
        private String fullName;
        private UUID seatId;
        private String seatLabel;
        private BigDecimal amount;
        private String paymentStatus;
        private UUID bookingId;
        private boolean currentUser;
    }

    @Data @Builder
    public static class Response {
        private UUID id;
        private UUID invitationId;
        private UUID showtimeId;
        private String status;
        private UUID selectorId;
        private boolean canSelectSeats;
        private boolean canPay;
        private LocalDateTime expiresAt;
        private LocalDateTime confirmedAt;
        private List<MemberResponse> members;
        private String checkoutUrl;
        private String qrCode;
        private boolean requiresRedirect;
    }
}
