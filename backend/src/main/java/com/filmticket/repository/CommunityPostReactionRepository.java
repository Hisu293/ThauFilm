package com.filmticket.repository;

import com.filmticket.entity.CommunityPostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityPostReactionRepository extends JpaRepository<CommunityPostReaction, UUID> {
    Optional<CommunityPostReaction> findByPostIdAndUserId(UUID postId, UUID userId);

    @Query("SELECT reaction.type, COUNT(reaction) FROM CommunityPostReaction reaction " +
            "WHERE reaction.postId = :postId GROUP BY reaction.type")
    List<Object[]> countByTypeForPost(@Param("postId") UUID postId);
}
