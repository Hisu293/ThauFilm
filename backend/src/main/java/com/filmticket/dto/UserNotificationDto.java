package com.filmticket.dto;

import com.filmticket.entity.UserNotification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class UserNotificationDto {
    private UUID id;
    private String notificationType;
    private String title;
    private String message;
    private String link;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static UserNotificationDto from(UserNotification notification) {
        return UserNotificationDto.builder()
                .id(notification.getId()).notificationType(notification.getNotificationType())
                .title(notification.getTitle()).message(notification.getMessage()).link(notification.getLink())
                .readAt(notification.getReadAt()).createdAt(notification.getCreatedAt()).build();
    }
}
