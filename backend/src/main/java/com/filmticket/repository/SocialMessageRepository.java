package com.filmticket.repository;

import com.filmticket.entity.SocialMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SocialMessageRepository extends JpaRepository<SocialMessage, UUID> {
    @Query("SELECT message FROM SocialMessage message " +
            "WHERE (message.senderId = :firstId AND message.recipientId = :secondId) " +
            "OR (message.senderId = :secondId AND message.recipientId = :firstId) " +
            "ORDER BY message.createdAt ASC")
    List<SocialMessage> findConversation(
            @Param("firstId") UUID firstId,
            @Param("secondId") UUID secondId
    );

    @Query("SELECT message FROM SocialMessage message " +
            "WHERE message.senderId = :userId OR message.recipientId = :userId " +
            "ORDER BY message.createdAt DESC")
    List<SocialMessage> findAllForUser(@Param("userId") UUID userId);
}
