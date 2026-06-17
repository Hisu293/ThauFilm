package com.filmticket.repository;

import com.filmticket.entity.Theater;
import com.filmticket.model.TheaterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TheaterRepository extends JpaRepository<Theater, UUID> {
    List<Theater> findByStatus(TheaterStatus status);
}
