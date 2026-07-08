package com.filmticket.repository;

import com.filmticket.entity.ShowtimePriceOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShowtimePriceOverrideRepository extends JpaRepository<ShowtimePriceOverride, UUID> {
    List<ShowtimePriceOverride> findByShowtimeId(UUID showtimeId);
    Optional<ShowtimePriceOverride> findByShowtimeIdAndSeatType(UUID showtimeId, String seatType);
}
