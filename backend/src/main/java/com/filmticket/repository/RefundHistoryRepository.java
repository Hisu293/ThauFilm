package com.filmticket.repository;

import com.filmticket.entity.RefundHistory;
import com.filmticket.entity.RefundHistoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Collection;
import java.util.List;

public interface RefundHistoryRepository extends JpaRepository<RefundHistory, UUID> {
    boolean existsByBookingIdAndStatusIn(UUID bookingId, Collection<RefundHistoryStatus> statuses);
    List<RefundHistory> findByStatus(RefundHistoryStatus status);
}
