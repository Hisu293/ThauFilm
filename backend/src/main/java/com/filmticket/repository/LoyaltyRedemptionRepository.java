package com.filmticket.repository;

import com.filmticket.entity.LoyaltyRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoyaltyRedemptionRepository extends JpaRepository<LoyaltyRedemption, UUID> {
    List<LoyaltyRedemption> findByUserIdOrderByRedeemedAtDesc(UUID userId);
    Optional<LoyaltyRedemption> findByDiscountId(UUID discountId);
}
