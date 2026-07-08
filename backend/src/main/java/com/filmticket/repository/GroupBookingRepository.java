package com.filmticket.repository;

import com.filmticket.entity.GroupBooking;
import com.filmticket.entity.GroupBookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupBookingRepository extends JpaRepository<GroupBooking, UUID> {
    Optional<GroupBooking> findByInvitationId(UUID invitationId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT groupBooking FROM GroupBooking groupBooking WHERE groupBooking.id = :id")
    Optional<GroupBooking> findLockedById(UUID id);
    List<GroupBooking> findByStatusInAndExpiresAtBefore(List<GroupBookingStatus> statuses, LocalDateTime now);
}
