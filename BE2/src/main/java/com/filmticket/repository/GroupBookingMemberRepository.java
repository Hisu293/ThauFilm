package com.filmticket.repository;

import com.filmticket.entity.GroupBookingMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupBookingMemberRepository extends JpaRepository<GroupBookingMember, UUID> {
    List<GroupBookingMember> findByGroupBookingIdOrderByCreatedAtAsc(UUID groupBookingId);
    Optional<GroupBookingMember> findByGroupBookingIdAndUserId(UUID groupBookingId, UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT member FROM GroupBookingMember member WHERE member.groupBookingId = :groupBookingId AND member.userId = :userId")
    Optional<GroupBookingMember> findLockedByGroupBookingIdAndUserId(UUID groupBookingId, UUID userId);
    boolean existsByBookingId(UUID bookingId);
}
