package com.filmticket.repository;

import com.filmticket.entity.MovieMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovieMatchRepository extends JpaRepository<MovieMatch, UUID> {
    Optional<MovieMatch> findByUserOneIdAndUserTwoId(UUID userOneId, UUID userTwoId);

    @Query("select m from MovieMatch m where m.userOneId = :userId or m.userTwoId = :userId order by m.createdAt desc")
    List<MovieMatch> findAllForUser(@Param("userId") UUID userId);
}
