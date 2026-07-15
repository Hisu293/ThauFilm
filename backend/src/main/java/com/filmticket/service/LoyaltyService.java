package com.filmticket.service;

import com.filmticket.dto.LoyaltyOverviewResponse;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoyaltyService {
    public static final int VND_PER_POINT = 1_000;
    private final LoyaltyAccountRepository accountRepository;
    private final LoyaltyRewardRepository rewardRepository;
    private final LoyaltyRedemptionRepository redemptionRepository;
    private final LoyaltyTransactionRepository transactionRepository;
    private final DiscountRepository discountRepository;

    @Transactional
    public void awardBookingPoints(UUID bookingId, UUID userId, BigDecimal paidAmount) {
        if (bookingId == null || userId == null || paidAmount == null || paidAmount.signum() <= 0) return;
        if (transactionRepository.existsByBookingIdAndTransactionType(bookingId, "EARN")) return;
        int points = paidAmount.divide(BigDecimal.valueOf(VND_PER_POINT), 0, RoundingMode.FLOOR).intValue();
        if (points <= 0) return;
        LoyaltyAccount account = getLockedAccount(userId);
        if (transactionRepository.existsByBookingIdAndTransactionType(bookingId, "EARN")) return;
        account.setPointsBalance(account.getPointsBalance() + points);
        account.setLifetimeEarned(account.getLifetimeEarned() + points);
        accountRepository.save(account);
        transactionRepository.save(LoyaltyTransaction.builder().userId(userId).bookingId(bookingId)
                .transactionType("EARN").points(points).balanceAfter(account.getPointsBalance())
                .description("Tích điểm từ đơn vé đã thanh toán").build());
    }

    @Transactional
    public LoyaltyOverviewResponse.RedemptionItem redeem(UUID userId, UUID rewardId) {
        LoyaltyReward reward = rewardRepository.findById(rewardId).filter(LoyaltyReward::isActive)
                .orElseThrow(() -> new BadRequestException("Quà đổi điểm không tồn tại hoặc đã ngừng áp dụng"));
        LoyaltyAccount account = getLockedAccount(userId);
        if (account.getPointsBalance() < reward.getPointsCost())
            throw new BadRequestException("Bạn chưa đủ điểm để đổi phần quà này");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(reward.getValidityDays());
        String code = generateRedemptionCode(reward.getRewardType());
        Discount discount = discountRepository.save(Discount.builder().code(code).name("Đổi điểm - " + reward.getName())
                .type("FIXED").value(reward.getMonetaryValue()).minPurchaseAmount(reward.getMinPurchaseAmount())
                .maxDiscountAmount(reward.getMonetaryValue()).validFrom(now).validTo(expiresAt)
                .usageLimit(1).usageCount(0).active(true).build());
        LoyaltyRedemption redemption = redemptionRepository.save(LoyaltyRedemption.builder()
                .userId(userId).rewardId(reward.getId()).discountId(discount.getId()).redemptionCode(code)
                .pointsSpent(reward.getPointsCost()).status("AVAILABLE").redeemedAt(now).expiresAt(expiresAt).build());
        account.setPointsBalance(account.getPointsBalance() - reward.getPointsCost());
        account.setLifetimeRedeemed(account.getLifetimeRedeemed() + reward.getPointsCost());
        accountRepository.save(account);
        transactionRepository.save(LoyaltyTransaction.builder().userId(userId).redemptionId(redemption.getId())
                .transactionType("REDEEM").points(-reward.getPointsCost()).balanceAfter(account.getPointsBalance())
                .description("Đổi " + reward.getName()).build());
        return toRedemption(redemption, reward);
    }

    @Transactional
    public LoyaltyOverviewResponse getOverview(UUID userId) {
        LoyaltyAccount account = accountRepository.findByUserId(userId)
                .orElseGet(() -> accountRepository.save(LoyaltyAccount.builder().userId(userId).build()));
        List<LoyaltyReward> rewards = rewardRepository.findByActiveTrueOrderByDisplayOrderAsc();
        Map<UUID, LoyaltyReward> rewardById = rewards.stream().collect(Collectors.toMap(LoyaltyReward::getId, Function.identity()));
        List<LoyaltyRedemption> redemptions = redemptionRepository.findByUserIdOrderByRedeemedAtDesc(userId);
        LocalDateTime now = LocalDateTime.now();
        redemptions.stream().filter(item -> "AVAILABLE".equals(item.getStatus()) && item.getExpiresAt().isBefore(now))
                .forEach(item -> { item.setStatus("EXPIRED"); discountRepository.findById(item.getDiscountId()).ifPresent(d -> d.setActive(false)); });
        return LoyaltyOverviewResponse.builder().pointsBalance(account.getPointsBalance())
                .lifetimeEarned(account.getLifetimeEarned()).lifetimeRedeemed(account.getLifetimeRedeemed())
                .vndPerPoint(VND_PER_POINT)
                .rewards(rewards.stream().map(r -> toReward(r, account.getPointsBalance())).toList())
                .redemptions(redemptions.stream().map(r -> toRedemption(r, rewardById.get(r.getRewardId()))).toList())
                .transactions(transactionRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toTransaction).toList())
                .build();
    }

    private LoyaltyAccount getLockedAccount(UUID userId) {
        return accountRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> accountRepository.saveAndFlush(LoyaltyAccount.builder().userId(userId).build()));
    }
    private LoyaltyOverviewResponse.RewardItem toReward(LoyaltyReward r, int balance) {
        return LoyaltyOverviewResponse.RewardItem.builder().id(r.getId()).code(r.getCode()).name(r.getName())
                .description(r.getDescription()).rewardType(r.getRewardType()).pointsCost(r.getPointsCost())
                .monetaryValue(r.getMonetaryValue()).minPurchaseAmount(r.getMinPurchaseAmount())
                .validityDays(r.getValidityDays()).affordable(balance >= r.getPointsCost()).build();
    }
    private LoyaltyOverviewResponse.RedemptionItem toRedemption(LoyaltyRedemption r, LoyaltyReward reward) {
        return LoyaltyOverviewResponse.RedemptionItem.builder().id(r.getId()).rewardId(r.getRewardId())
                .rewardName(reward == null ? "Quà đổi điểm" : reward.getName())
                .rewardType(reward == null ? "VOUCHER" : reward.getRewardType()).redemptionCode(r.getRedemptionCode())
                .pointsSpent(r.getPointsSpent()).status(r.getStatus()).redeemedAt(r.getRedeemedAt())
                .expiresAt(r.getExpiresAt()).usedAt(r.getUsedAt()).build();
    }
    private LoyaltyOverviewResponse.TransactionItem toTransaction(LoyaltyTransaction t) {
        return LoyaltyOverviewResponse.TransactionItem.builder().id(t.getId()).transactionType(t.getTransactionType())
                .points(t.getPoints()).balanceAfter(t.getBalanceAfter()).description(t.getDescription()).createdAt(t.getCreatedAt()).build();
    }
    private String generateRedemptionCode(String type) {
        String prefix = switch (String.valueOf(type).toUpperCase()) { case "TICKET" -> "VE"; case "COMBO" -> "CB"; default -> "VC"; };
        return prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
