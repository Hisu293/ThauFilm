package com.filmticket.repository;

import com.filmticket.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityPostRepository extends JpaRepository<CommunityPost, UUID> {
    List<CommunityPost> findTop50ByUserIdInOrderByCreatedAtDesc(List<UUID> userIds);

    Optional<CommunityPost> findByIdAndUserId(UUID id, UUID userId);
}
