package com.filmticket.dto;

import jakarta.validation.constraints.NotNull;
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
        private String bio;
        private List<String> favoriteGenres;
        private String preferredTheater;
        private String availableTimes;
        private boolean active;
        private int compatibilityPercent;
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
}
