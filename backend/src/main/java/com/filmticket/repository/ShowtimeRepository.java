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

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomId = :cinemaRoomId AND s.startTime < :newEndTime AND s.endTime > :newStartTime")
    List<Showtime> findOverlappingShowtimes(@Param("cinemaRoomId") UUID cinemaRoomId,
            @Param("newStartTime") LocalDateTime newStartTime,
            @Param("newEndTime") LocalDateTime newEndTime);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomId = :cinemaRoomId AND s.startTime < :newEndTime AND s.endTime > :newStartTime AND s.id != :excludeId")
    List<Showtime> findOverlappingShowtimesExcluding(@Param("cinemaRoomId") UUID cinemaRoomId,
            @Param("newStartTime") LocalDateTime newStartTime,
            @Param("newEndTime") LocalDateTime newEndTime,
            @Param("excludeId") UUID excludeId);

    List<Showtime> findByMovieIdOrderByStartTimeAsc(UUID movieId);
    List<Showtime> findByMovieIdAndOnlineTrueOrderByStartTimeAsc(UUID movieId);

    @Query("SELECT s FROM Showtime s WHERE DATE(s.startTime) = :date ORDER BY s.startTime ASC")
    List<Showtime> findByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM Showtime s WHERE s.movieId = :movieId AND DATE(s.startTime) = :date ORDER BY s.startTime ASC")
    List<Showtime> findByMovieIdAndDate(@Param("movieId") UUID movieId, @Param("date") LocalDate date);

    @Query("SELECT s FROM Showtime s WHERE DATE(s.startTime) >= :today ORDER BY s.startTime ASC")
    List<Showtime> findUpcoming(@Param("today") LocalDate today);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomId IN (SELECT c.id FROM CinemaRoom c WHERE c.theaterId = :theaterId) ORDER BY s.startTime ASC")
    List<Showtime> findByTheaterId(@Param("theaterId") UUID theaterId);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomId IN (SELECT c.id FROM CinemaRoom c WHERE c.theaterId = :theaterId) AND s.movieId = :movieId ORDER BY s.startTime ASC")
    List<Showtime> findByTheaterIdAndMovieId(@Param("theaterId") UUID theaterId, @Param("movieId") UUID movieId);

    @Query("SELECT DISTINCT s.cinemaRoomId FROM Showtime s WHERE s.movieId = :movieId")
    List<UUID> findDistinctCinemaRoomIdsByMovieId(@Param("movieId") UUID movieId);

    @Query("SELECT s FROM Showtime s, Booking b WHERE b.showtimeId = s.id " +
            "AND b.userId = :userId AND b.status = com.filmticket.entity.BookingStatus.CONFIRMED " +
            "AND s.movieId = :movieId AND s.online = true " +
            "AND s.startTime <= :now AND s.endTime >= :now " +
            "ORDER BY s.endTime ASC")
    List<Showtime> findEligibleStreamingShowtimes(@Param("userId") UUID userId,
                                                  @Param("movieId") UUID movieId,
                                                  @Param("now") LocalDateTime now);
}
