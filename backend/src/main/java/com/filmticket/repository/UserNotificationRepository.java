package com.filmticket.repository;

import com.filmticket.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserNotificationRepository extends JpaRepository<UserNotification, UUID> {
    List<UserNotification> findTop30ByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserNotification> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("update UserNotification notification set notification.readAt = :readAt " +
            "where notification.userId = :userId and notification.readAt is null")
    int markAllRead(@Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);
}
