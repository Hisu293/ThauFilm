package com.filmticket.repository;

import com.filmticket.entity.MovieMatchingProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovieMatchingProfileRepository extends JpaRepository<MovieMatchingProfile, UUID> {
    List<MovieMatchingProfile> findByActiveTrueAndUserIdNot(UUID userId);
}
