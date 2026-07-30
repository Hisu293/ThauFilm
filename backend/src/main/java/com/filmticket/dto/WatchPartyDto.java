package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class WatchPartyDto {
    private WatchPartyDto() {}

    @Data
    public static class CreateRequest {
        private UUID movieId;
    }

    @Data
    public static class PlaybackRequest {
        private double currentTime;
        private boolean paused;
    }

    @Data
    public static class ChatRequest {
        private String content;
    }

    @Data
    public static class ReactionRequest {
        private String reaction;
    }

    @Data
    public static class RefundRequest {
        private String refundMethod;
        private String bankBin;
        private String accountNumber;
    }

    @Data
    @Builder
    public static class MemberResponse {
        private UUID userId;
        private String fullName;
        private String email;
        private boolean creator;
        private boolean currentUser;
        private boolean paid;
    }

    @Data
    @Builder
    public static class ChatMessageResponse {
        private UUID id;
        private UUID senderId;
        private String senderName;
        private String content;
        private Instant createdAt;
    }

    @Data
    @Builder
    public static class PlaybackStateResponse {
        private double currentTime;
        private boolean paused;
        private Instant updatedAt;
        private UUID updatedBy;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private UUID movieId;
        private String movieTitle;
        private String posterUrl;
        private Instant expiresAt;
        private BigDecimal pricePerMember;
        private boolean readyToWatch;
        private boolean currentUserPaid;
        private String checkoutUrl;
        private String qrCode;
        private String invitePath;
        private List<MemberResponse> members;
        private List<ChatMessageResponse> messages;
        private PlaybackStateResponse playback;
    }
}
