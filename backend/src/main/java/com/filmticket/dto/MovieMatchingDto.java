package com.filmticket.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class MovieMatchingDto {
    private MovieMatchingDto() {}

    @Data
    public static class ProfileRequest {
        @Size(max = 500) private String bio;
        @Size(max = 20) private List<@Size(max = 50) String> favoriteGenres;
        @Size(max = 255) private String preferredTheater;
        @Size(max = 500) private String availableTimes;
        private boolean active;
    }

    @Data
    public static class ActionRequest {
        @NotNull private Decision decision;
    }

    public enum Decision { LIKE, PASS }

    @Data @Builder
    public static class ProfileResponse {
        private UUID userId;
        private String fullName;
        private String avatarUrl;
        private boolean customDatingPhoto;
        private String bio;
        private List<String> favoriteGenres;
        private String preferredTheater;
        private String availableTimes;
        private boolean active;
        private int compatibilityPercent;
        private LocalDateTime lastInteractedAt;
    }

    @Data @Builder
    public static class ActionResponse {
        private boolean matched;
        private UUID matchId;
    }

    @Data @Builder
    public static class MatchResponse {
        private UUID matchId;
        private LocalDateTime matchedAt;
        private ProfileResponse person;
    }

    @Data
    public static class MessageRequest { @NotBlank @Size(max = 1000) private String content; }

    @Data @Builder
    public static class MessageResponse {
        private UUID id; private UUID matchId; private UUID senderId; private String senderName;
        private String content; private LocalDateTime createdAt;
    }

    @Data
    public static class InvitationRequest { @NotNull private UUID showtimeId; }

    @Data
    public static class InvitationDecisionRequest { @NotNull private InvitationDecision decision; }
    public enum InvitationDecision { ACCEPT, DECLINE }

    @Data @Builder
    public static class InvitationResponse {
        private UUID id; private UUID matchId; private UUID senderId; private UUID recipientId;
        private UUID groupBookingId;
        private UUID showtimeId; private String movieTitle; private String theaterName; private String roomName;
        private LocalDateTime startTime; private String status; private LocalDateTime createdAt;
        private LocalDateTime respondedAt; private String bookingPath;
        private String groupBookingStatus;
        private boolean expired; private boolean canSelectSeats;
    }

    @Data
    public static class ReportRequest {
        @NotBlank @Size(max = 100) private String reason;
        @Size(max = 1000) private String details;
    }
}
