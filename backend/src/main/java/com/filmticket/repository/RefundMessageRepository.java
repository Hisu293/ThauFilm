package com.filmticket.repository;

import com.filmticket.entity.RefundMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RefundMessageRepository extends JpaRepository<RefundMessage, UUID> {
    List<RefundMessage> findByRefundRequestIdOrderByCreatedAtAsc(UUID refundRequestId);
}
