package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CommunityFeedResponse {
    UUID reviewId;
    UUID userId;
    String userFullName;
    String userAvatarUrl;
    UUID movieId;
    String movieTitle;
    String moviePosterUrl;
    Integer rating;
    String content;
    LocalDateTime createdAt;
}
