package com.filmticket.repository;

import com.filmticket.entity.MovieMatchingAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovieMatchingActionRepository extends JpaRepository<MovieMatchingAction, UUID> {
    Optional<MovieMatchingAction> findByActorIdAndTargetId(UUID actorId, UUID targetId);
    List<MovieMatchingAction> findByActorId(UUID actorId);
    List<MovieMatchingAction> findByActorIdAndDecisionOrderByUpdatedAtDesc(UUID actorId, MovieMatchingAction.Decision decision);
    boolean existsByActorIdAndTargetIdAndDecision(UUID actorId, UUID targetId, MovieMatchingAction.Decision decision);
    void deleteByActorIdAndTargetIdOrActorIdAndTargetId(UUID actorId, UUID targetId, UUID targetActorId, UUID targetTargetId);
}
