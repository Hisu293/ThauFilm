package com.filmticket.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LoyaltyOverviewResponse {
    private int pointsBalance;
    private int lifetimeEarned;
    private int lifetimeRedeemed;
    private int vndPerPoint;
    private List<RewardItem> rewards;
    private List<RedemptionItem> redemptions;
    private List<TransactionItem> transactions;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RewardItem {
        private UUID id;
        private String code;
        private String name;
        private String description;
        private String rewardType;
        private int pointsCost;
        private BigDecimal monetaryValue;
        private BigDecimal minPurchaseAmount;
        private int validityDays;
        private boolean affordable;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RedemptionItem {
        private UUID id;
        private UUID rewardId;
        private String rewardName;
        private String rewardType;
        private String redemptionCode;
        private int pointsSpent;
        private String status;
        private LocalDateTime redeemedAt;
        private LocalDateTime expiresAt;
        private LocalDateTime usedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TransactionItem {
        private UUID id;
        private String transactionType;
        private int points;
        private int balanceAfter;
        private String description;
        private LocalDateTime createdAt;
    }
}
