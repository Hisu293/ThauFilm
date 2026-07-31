package com.filmticket.repository;

import com.filmticket.entity.RefundRequest;
import com.filmticket.entity.RefundRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {
    List<RefundRequest> findAllByOrderByCreatedAtDesc();
    List<RefundRequest> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    @Query("select distinct request from RefundRequest request, Payment payment " +
            "where request.paymentId = payment.id " +
            "and (request.customerId = :userId or payment.paidByUserId = :userId) " +
            "order by request.createdAt desc")
    List<RefundRequest> findVisibleToUser(@Param("userId") UUID userId);
    Optional<RefundRequest> findFirstByBookingIdAndStatusIn(UUID bookingId, Collection<RefundRequestStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from RefundRequest request where request.id = :id")
    Optional<RefundRequest> findByIdForUpdate(@Param("id") UUID id);
}
