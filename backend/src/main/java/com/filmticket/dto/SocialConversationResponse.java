package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class SocialConversationResponse {
    UUID userId;
    String fullName;
    String avatarUrl;
    String lastMessage;
    LocalDateTime lastMessageAt;
    long unreadCount;
    boolean mutualFollow;
}
