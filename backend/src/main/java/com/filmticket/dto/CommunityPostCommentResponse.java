package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CommunityPostCommentResponse {
    UUID id;
    UUID postId;
    UUID userId;
    String userFullName;
    String userAvatarUrl;
    String content;
    boolean owner;
    LocalDateTime createdAt;
}
