package com.filmticket.repository;

import com.filmticket.entity.SeatAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeatAvailabilityRepository extends JpaRepository<SeatAvailability, UUID> {
    List<SeatAvailability> findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(UUID showtimeId);
    Optional<SeatAvailability> findByShowtimeIdAndSeatId(UUID showtimeId, UUID seatId);
}
