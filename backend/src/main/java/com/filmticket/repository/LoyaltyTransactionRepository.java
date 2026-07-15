package com.filmticket.repository;

import com.filmticket.entity.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, UUID> {
    boolean existsByBookingIdAndTransactionType(UUID bookingId, String transactionType);
    List<LoyaltyTransaction> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
