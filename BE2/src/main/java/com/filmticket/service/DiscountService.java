package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.entity.Discount;
import com.filmticket.entity.DiscountUsage;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import com.filmticket.repository.DiscountUsageRepository;
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

    public List<DiscountResponse> getActiveDiscounts() {
        return discountRepository.findAll().stream()
                .filter(this::isActive)
                .map(DiscountResponse::fromDiscount)
                .toList();
    }

    @Transactional
    public BigDecimal calculateDiscount(String code, BigDecimal totalAmount, UUID userId) {
        Discount discount = discountRepository.findByCodeAndActiveTrue(code)
                .orElseThrow(() -> new BadRequestException("Invalid discount code"));

        if (!isActive(discount)) {
            throw new BadRequestException("Discount code is expired or inactive");
        }
        if (discountUsageRepository.existsByDiscountIdAndUserId(discount.getId(), userId)) {
            throw new BadRequestException("You have already used this discount code");
        }
        if (discount.getUsageCount() >= discount.getUsageLimit()) {
            throw new BadRequestException("Discount code usage limit reached");
        }
        if (totalAmount.compareTo(discount.getMinPurchaseAmount()) < 0) {
            throw new BadRequestException("Purchase amount does not meet minimum requirement");
        }

        BigDecimal discountAmount;
        if ("PERCENTAGE".equalsIgnoreCase(discount.getType())) {
            discountAmount = totalAmount.multiply(discount.getValue())
                    .divide(BigDecimal.valueOf(100));
        } else if ("FIXED".equalsIgnoreCase(discount.getType())) {
            discountAmount = discount.getValue();
        } else {
            throw new BadRequestException("Unsupported discount type: " + discount.getType());
        }

        if (discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
            discountAmount = discount.getMaxDiscountAmount();
        }

        discount.setUsageCount(discount.getUsageCount() + 1);
        discountRepository.save(discount);

        DiscountUsage usage = DiscountUsage.builder()
                .discount(discount)
                .user(com.filmticket.entity.User.builder().id(userId).build())
                .build();
        discountUsageRepository.save(usage);

        return discountAmount;
    }

    private boolean isActive(Discount discount) {
        LocalDateTime now = LocalDateTime.now();
        return discount.isActive()
                && !now.isBefore(discount.getValidFrom())
                && !now.isAfter(discount.getValidTo());
    }
}
