package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class SocialMessageResponse {
    UUID id;
    UUID senderId;
    UUID recipientId;
    String content;
    LocalDateTime createdAt;
    LocalDateTime readAt;
}
