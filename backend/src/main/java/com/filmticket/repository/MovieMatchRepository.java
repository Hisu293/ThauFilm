package com.filmticket.repository;

import com.filmticket.entity.MovieMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovieMatchRepository extends JpaRepository<MovieMatch, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MovieMatch m where m.id = :id")
    Optional<MovieMatch> findLockedById(@Param("id") UUID id);

    Optional<MovieMatch> findByUserOneIdAndUserTwoId(UUID userOneId, UUID userTwoId);

    @Query("select m from MovieMatch m where (m.userOneId = :userId or m.userTwoId = :userId) and m.status = :status order by m.createdAt desc")
    List<MovieMatch> findAllForUser(@Param("userId") UUID userId, @Param("status") MovieMatch.Status status);
}
