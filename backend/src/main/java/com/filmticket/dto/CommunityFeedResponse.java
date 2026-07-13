package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CommunityFeedResponse {
    UUID id;
    String itemType;
    UUID reviewId;
    UUID postId;
    UUID userId;
    String userFullName;
    String userAvatarUrl;
    UUID movieId;
    String movieTitle;
    String moviePosterUrl;
    Integer rating;
    String content;
    String imageUrl;
    boolean owner;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
