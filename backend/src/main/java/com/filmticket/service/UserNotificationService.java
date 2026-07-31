package com.filmticket.service;

import com.filmticket.dto.UserNotificationDto;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserNotificationService {
    private final UserNotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<UserNotificationDto> recent(UUID userId) {
        return notificationRepository.findTop30ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(UserNotificationDto::from).toList();
    }

    @Transactional
    public UserNotificationDto markRead(UUID userId, UUID notificationId) {
        var notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thông báo"));
        if (notification.getReadAt() == null) notification.setReadAt(LocalDateTime.now());
        return UserNotificationDto.from(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId, LocalDateTime.now());
    }
}
