package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "loyalty_rewards")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyReward {
    @Id private UUID id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    @Column(nullable = false, length = 120) private String name;
    @Column(length = 500) private String description;
    @Column(name = "reward_type", nullable = false, length = 20) private String rewardType;
    @Column(name = "points_cost", nullable = false) private int pointsCost;
    @Column(name = "monetary_value", nullable = false, precision = 10, scale = 2) private BigDecimal monetaryValue;
    @Column(name = "min_purchase_amount", nullable = false, precision = 10, scale = 2) private BigDecimal minPurchaseAmount;
    @Column(name = "validity_days", nullable = false) private int validityDays;
    @Column(nullable = false) private boolean active;
    @Column(name = "display_order", nullable = false) private int displayOrder;
}
