package com.filmticket.repository;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :bookingId")
    Optional<Booking> findByIdForUpdate(@Param("bookingId") UUID bookingId);

    Optional<Booking> findByConfirmationCode(String confirmationCode);

    @Query("SELECT b FROM Booking b WHERE b.showtimeId = :showtimeId AND b.status = :status AND EXISTS (SELECT bs FROM BookingSeat bs WHERE bs.bookingId = b.id AND bs.seatId = :seatId)")
    boolean existsByShowtimeIdAndStatusAndSeatId(@Param("showtimeId") UUID showtimeId, @Param("status") BookingStatus status, @Param("seatId") UUID seatId);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END " +
            "FROM Booking b WHERE b.showtimeId = :showtimeId AND b.status = :status AND b.id <> :bookingId " +
            "AND EXISTS (SELECT bs FROM BookingSeat bs WHERE bs.bookingId = b.id AND bs.seatId = :seatId)")
    boolean existsByShowtimeIdAndStatusAndSeatIdAndIdNot(@Param("showtimeId") UUID showtimeId,
                                                         @Param("status") BookingStatus status,
                                                         @Param("seatId") UUID seatId,
                                                         @Param("bookingId") UUID bookingId);

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
            "AND s.movieId = :movieId " +
            "AND ((s.online = true AND s.startTime <= :now) OR (s.online = false AND s.endTime <= :now))")
    boolean hasCompletedMovieBooking(@Param("userId") UUID userId,
                                     @Param("movieId") UUID movieId,
                                     @Param("status") BookingStatus status,
                                     @Param("now") LocalDateTime now);

    // BỔ SUNG THÊM HÀM NÀY ĐỂ TÌM BOOKING ĐANG HOLD CỦA USER THEO SUẤT CHIẾU
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END " +
            "FROM Booking b, Showtime s WHERE b.showtimeId = s.id " +
            "AND b.userId = :userId AND b.status = :status " +
            "AND s.movieId = :movieId")
    boolean hasConfirmedMovieBooking(@Param("userId") UUID userId,
                                     @Param("movieId") UUID movieId,
                                     @Param("status") BookingStatus status);

    @Query("SELECT b FROM Booking b, Showtime s WHERE b.showtimeId = s.id " +
            "AND b.userId = :userId AND b.status = :status " +
            "AND s.movieId = :movieId AND s.online = true AND s.startTime <= :now AND s.endTime >= :now " +
            "ORDER BY s.endTime ASC")
    List<Booking> findEligibleStreamingBookings(@Param("userId") UUID userId,
                                                @Param("movieId") UUID movieId,
                                                @Param("status") BookingStatus status,
                                                @Param("now") LocalDateTime now);

    List<Booking> findByStatusAndConfirmedAtBetween(BookingStatus status, LocalDateTime from, LocalDateTime to);
}
