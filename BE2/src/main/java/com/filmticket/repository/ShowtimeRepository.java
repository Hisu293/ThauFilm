package com.filmticket.repository;

import com.filmticket.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {
    List<Showtime> findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(UUID cinemaRoomId, LocalDateTime endTime, LocalDateTime startTime);
    List<Showtime> findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(UUID cinemaRoomId, LocalDateTime endTime, LocalDateTime startTime, UUID id);
}
