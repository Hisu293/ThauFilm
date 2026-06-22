package com.filmticket.repository;

import com.filmticket.entity.FavoriteListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FavoriteListItemRepository extends JpaRepository<FavoriteListItem, UUID> {

    List<FavoriteListItem> findByFavoriteListIdOrderByAddedAtDesc(UUID favoriteListId);

    Optional<FavoriteListItem> findByFavoriteListIdAndMovieId(UUID favoriteListId, UUID movieId);

    boolean existsByFavoriteListIdAndMovieId(UUID favoriteListId, UUID movieId);

    void deleteByFavoriteListIdAndMovieId(UUID favoriteListId, UUID movieId);

    long countByFavoriteListId(UUID favoriteListId);
}
