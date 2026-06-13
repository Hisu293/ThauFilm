package com.filmticket.repository;

import com.filmticket.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {
    List<Showtime> findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(UUID cinemaRoomId, LocalDateTime endTime, LocalDateTime startTime);
    List<Showtime> findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(UUID cinemaRoomId, LocalDateTime endTime, LocalDateTime startTime, UUID id);

    List<Showtime> findByMovieIdOrderByStartTimeAsc(UUID movieId);

    @Query("SELECT s FROM Showtime s WHERE DATE(s.startTime) = :date ORDER BY s.startTime ASC")
    List<Showtime> findByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM Showtime s WHERE s.movie.id = :movieId AND DATE(s.startTime) = :date ORDER BY s.startTime ASC")
    List<Showtime> findByMovieIdAndDate(@Param("movieId") UUID movieId, @Param("date") LocalDate date);

    @Query("SELECT s FROM Showtime s WHERE DATE(s.startTime) >= :today ORDER BY s.startTime ASC")
    List<Showtime> findUpcoming(@Param("today") LocalDate today);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoom.theater.id = :theaterId ORDER BY s.startTime ASC")
    List<Showtime> findByTheaterId(@Param("theaterId") UUID theaterId);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoom.theater.id = :theaterId AND s.movie.id = :movieId ORDER BY s.startTime ASC")
    List<Showtime> findByTheaterIdAndMovieId(@Param("theaterId") UUID theaterId, @Param("movieId") UUID movieId);

    @Query("SELECT DISTINCT s.cinemaRoom.theater.id FROM Showtime s WHERE s.movie.id = :movieId")
    List<UUID> findDistinctTheaterIdsByMovieId(@Param("movieId") UUID movieId);
}
