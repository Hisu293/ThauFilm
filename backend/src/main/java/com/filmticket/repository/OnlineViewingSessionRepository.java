package com.filmticket.repository;

import com.filmticket.entity.OnlineViewingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnlineViewingSessionRepository extends JpaRepository<OnlineViewingSession, UUID> {
    Optional<OnlineViewingSession> findByBookingId(UUID bookingId);

    Optional<OnlineViewingSession> findByUserIdAndMovieIdAndDeviceId(
            UUID userId,
            UUID movieId,
            String deviceId
    );
}
