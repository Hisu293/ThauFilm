package com.filmticket.repository;

import com.filmticket.entity.FavoriteList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FavoriteListRepository extends JpaRepository<FavoriteList, UUID> {

    List<FavoriteList> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<FavoriteList> findByIdAndUserId(UUID id, UUID userId);

    List<FavoriteList> findByUserIdOrIsPublicTrueOrderByCreatedAtDesc(UUID userId);
}
