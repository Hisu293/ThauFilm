package com.filmticket.repository;

import com.filmticket.entity.BookingSeat;
import com.filmticket.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    List<BookingSeat> findByBookingId(UUID bookingId);

    @Query("SELECT bs.seatId FROM BookingSeat bs, Booking b " +
            "WHERE bs.bookingId = b.id AND b.userId = :userId " +
            "AND b.showtimeId = :showtimeId AND b.status = :status " +
            "AND b.holdExpiresAt > :now")
    List<UUID> findActiveHeldSeatIds(
            @Param("userId") UUID userId,
            @Param("showtimeId") UUID showtimeId,
            @Param("status") BookingStatus status,
            @Param("now") LocalDateTime now
    );
}
