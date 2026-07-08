package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class MovieChatResponse {
    private String answer;
    private List<MovieRecommendation> recommendations;

    @Data
    @Builder
    public static class MovieRecommendation {
        private UUID id;
        private String title;
        private String genre;
        private Integer durationMinutes;
        private BigDecimal rating;
        private String posterUrl;
        private String status;
        private String reason;
    }
}
