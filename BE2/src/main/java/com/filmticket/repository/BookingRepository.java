package com.filmticket.repository;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);
    Optional<Booking> findByConfirmationCode(String confirmationCode);
    boolean existsByShowtimeIdAndStatusAndBookingSeatsSeatId(UUID showtimeId, BookingStatus status, UUID seatId);
}
