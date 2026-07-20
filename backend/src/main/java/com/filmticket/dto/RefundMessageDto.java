package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class RefundMessageDto {
    private UUID id;
    private UUID senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String imageUrl;
    private LocalDateTime createdAt;
}
