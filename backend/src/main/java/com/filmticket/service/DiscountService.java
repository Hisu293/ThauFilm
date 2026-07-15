package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.entity.Discount;
import com.filmticket.entity.DiscountUsage;
import com.filmticket.entity.LoyaltyRedemption;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import com.filmticket.repository.DiscountUsageRepository;
import com.filmticket.repository.LoyaltyRedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DiscountService {

    private final DiscountRepository discountRepository;
    private final DiscountUsageRepository discountUsageRepository;
    private final LoyaltyRedemptionRepository loyaltyRedemptionRepository;

    public List<DiscountResponse> getActiveDiscounts() {
        return discountRepository.findAll().stream()
                .filter(this::isActive)
                .map(DiscountResponse::fromDiscount)
                .toList();
    }

    @Transactional
    public BigDecimal calculateDiscount(String code, BigDecimal totalAmount, UUID userId) {
        return calculateDiscount(code, totalAmount, userId, null);
    }

    @Transactional
    public BigDecimal calculateDiscount(String code, BigDecimal totalAmount, UUID userId, List<String> seatTypes) {
        String normalizedCode = code.trim().toUpperCase();
        Discount discount = discountRepository.findByCodeAndActiveTrue(normalizedCode)
                .orElseThrow(() -> new BadRequestException("Invalid discount code"));

        if (!isActive(discount)) {
            throw new BadRequestException("Discount code is expired or inactive");
        }
        LoyaltyRedemption rewardRedemption = loyaltyRedemptionRepository.findByDiscountId(discount.getId()).orElse(null);
        if (rewardRedemption != null) {
            if (!rewardRedemption.getUserId().equals(userId)) {
                throw new BadRequestException("Mã đổi điểm này chỉ dành cho tài khoản đã đổi quà");
            }
            if (!"AVAILABLE".equals(rewardRedemption.getStatus())) {
                throw new BadRequestException("Mã đổi điểm đã được sử dụng hoặc hết hạn");
            }
        }
        if (discountUsageRepository.existsByDiscountIdAndUserId(discount.getId(), userId)) {
            throw new BadRequestException("You have already used this discount code");
        }
        Integer usageLimit = discount.getUsageLimit();
        Integer usageCount = discount.getUsageCount() == null ? 0 : discount.getUsageCount();
        if (usageLimit != null && usageLimit > 0 && usageCount >= usageLimit) {
            throw new BadRequestException("Discount code usage limit reached");
        }
        if (totalAmount.compareTo(discount.getMinPurchaseAmount()) < 0) {
            throw new BadRequestException("Purchase amount does not meet minimum requirement");
        }

        // Validate seat type restriction
        if (discount.getApplicableSeatTypes() != null && !discount.getApplicableSeatTypes().isBlank()) {
            if (seatTypes == null || seatTypes.isEmpty()) {
                throw new BadRequestException("This discount code is only applicable to seat types: " + discount.getApplicableSeatTypes());
            }
            List<String> allowedTypes = java.util.Arrays.stream(discount.getApplicableSeatTypes().toUpperCase().split(","))
                    .map(String::trim).toList();
            boolean hasMatch = seatTypes.stream().anyMatch(t -> allowedTypes.contains(t.toUpperCase()));
            if (!hasMatch) {
                throw new BadRequestException("This discount code is only applicable to seat types: " + discount.getApplicableSeatTypes());
            }
        }

        BigDecimal discountAmount;
        if ("PERCENTAGE".equalsIgnoreCase(discount.getType()) || "PERCENT".equalsIgnoreCase(discount.getType())) {
            discountAmount = totalAmount.multiply(discount.getValue())
                    .divide(BigDecimal.valueOf(100));
        } else if ("FIXED".equalsIgnoreCase(discount.getType())) {
            discountAmount = discount.getValue();
        } else {
            throw new BadRequestException("Unsupported discount type: " + discount.getType());
        }

        if (discount.getMaxDiscountAmount() != null
                && discount.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) > 0
                && discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
            discountAmount = discount.getMaxDiscountAmount();
        }
        discountAmount = discountAmount.min(totalAmount).max(BigDecimal.ZERO);

        discount.setUsageCount(usageCount + 1);
        discountRepository.save(discount);

        DiscountUsage usage = DiscountUsage.builder()
                .discountId(discount.getId())
                .userId(userId)
                .build();
        discountUsageRepository.save(usage);

        if (rewardRedemption != null) {
            rewardRedemption.setStatus("USED");
            rewardRedemption.setUsedAt(LocalDateTime.now());
            loyaltyRedemptionRepository.save(rewardRedemption);
        }

        return discountAmount;
    }

    private boolean isActive(Discount discount) {
        LocalDateTime now = LocalDateTime.now();
        return discount.isActive()
                && !now.isBefore(discount.getValidFrom())
                && !now.isAfter(discount.getValidTo());
    }
}
