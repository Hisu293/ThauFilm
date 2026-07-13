package com.filmticket.repository;

import com.filmticket.entity.CommunityPostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityPostCommentRepository extends JpaRepository<CommunityPostComment, UUID> {
    List<CommunityPostComment> findTop100ByPostIdOrderByCreatedAtDesc(UUID postId);

    long countByPostId(UUID postId);

    Optional<CommunityPostComment> findByIdAndUserId(UUID id, UUID userId);
}
