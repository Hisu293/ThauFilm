package com.filmticket.repository;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);
    
    Optional<Booking> findByConfirmationCode(String confirmationCode);
    
    @Query("SELECT b FROM Booking b WHERE b.showtimeId = :showtimeId AND b.status = :status AND EXISTS (SELECT bs FROM BookingSeat bs WHERE bs.bookingId = b.id AND bs.seatId = :seatId)")
    boolean existsByShowtimeIdAndStatusAndSeatId(@Param("showtimeId") UUID showtimeId, @Param("status") BookingStatus status, @Param("seatId") UUID seatId);
    
    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.holdExpiresAt < :now")
    List<Booking> findExpiredHolds(@Param("status") BookingStatus status, @Param("now") LocalDateTime now);
    
    @Query("SELECT b FROM Booking b WHERE b.status = 'HOLD'")
    List<Booking> findAllActiveHolds();

    @Query("SELECT b.showtimeId, COUNT(bs.id) FROM Booking b, BookingSeat bs " +
            "WHERE bs.bookingId = b.id AND b.status = :status GROUP BY b.showtimeId")
    List<Object[]> countSeatsByShowtimeAndStatus(@Param("status") BookingStatus status);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END " +
            "FROM Booking b, Showtime s WHERE b.showtimeId = s.id " +
            "AND b.userId = :userId AND b.status = :status " +
            "AND s.movieId = :movieId AND s.endTime <= :now")
    boolean hasCompletedMovieBooking(@Param("userId") UUID userId,
                                     @Param("movieId") UUID movieId,
                                     @Param("status") BookingStatus status,
                                     @Param("now") LocalDateTime now);
}
