package com.filmticket.repository;

import com.filmticket.entity.SeatTypePriceConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeatTypePriceConfigRepository extends JpaRepository<SeatTypePriceConfig, UUID> {
    List<SeatTypePriceConfig> findByActiveTrue();
    Optional<SeatTypePriceConfig> findBySeatTypeAndActiveTrue(String seatType);
}
