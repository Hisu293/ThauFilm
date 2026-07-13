package com.filmticket.repository;

import com.filmticket.entity.OnlineMovieView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OnlineMovieViewRepository extends JpaRepository<OnlineMovieView, UUID> {
    List<OnlineMovieView> findByViewedAtBetween(LocalDateTime from, LocalDateTime to);
}
