package com.filmticket.repository;

import com.filmticket.entity.SeatAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeatAvailabilityRepository extends JpaRepository<SeatAvailability, UUID> {
    @Query("SELECT sa FROM SeatAvailability sa WHERE sa.showtimeId = :showtimeId ORDER BY sa.seatId")
    List<SeatAvailability> findByShowtimeIdOrderBySeatId(UUID showtimeId);
    
    Optional<SeatAvailability> findByShowtimeIdAndSeatId(UUID showtimeId, UUID seatId);
}
