package com.filmticket.repository;

import com.filmticket.entity.DiscountUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DiscountUsageRepository extends JpaRepository<DiscountUsage, UUID> {
    boolean existsByDiscountIdAndUserId(UUID discountId, UUID userId);
}
