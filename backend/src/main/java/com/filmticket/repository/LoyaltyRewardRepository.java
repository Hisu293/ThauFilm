package com.filmticket.repository;

import com.filmticket.entity.LoyaltyReward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LoyaltyRewardRepository extends JpaRepository<LoyaltyReward, UUID> {
    List<LoyaltyReward> findByActiveTrueOrderByDisplayOrderAsc();
}
