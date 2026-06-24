package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.dto.StaffPromotionRequest;
import com.filmticket.entity.Discount;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffPromotionService {

    private final DiscountRepository discountRepository;

    public List<DiscountResponse> listPromotions() {
        return discountRepository.findAll().stream()
                .map(DiscountResponse::fromDiscount)
                .toList();
    }

    public DiscountResponse getPromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        return DiscountResponse.fromDiscount(discount);
    }

    @Transactional
    public DiscountResponse createPromotion(StaffPromotionRequest request) {
        Discount discount = new Discount();
        discount.setCode(request.getCode().trim().toUpperCase());
        discount.setName(request.getName());
        discount.setType(normalizeType(request.getType()));
        discount.setValue(request.getValue());
        discount.setMinPurchaseAmount(request.getMinPurchaseAmount());
        discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        discount.setValidFrom(request.getValidFrom());
        discount.setValidTo(request.getValidTo());
        discount.setUsageLimit(request.getUsageLimit());
        discount.setUsageCount(0);
        discount.setActive(Boolean.TRUE.equals(request.getActive()));
        Discount saved = discountRepository.save(discount);
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse updatePromotion(UUID promotionId, StaffPromotionRequest request) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        discount.setName(request.getName());
        discount.setType(normalizeType(request.getType()));
        discount.setValue(request.getValue());
        discount.setMinPurchaseAmount(request.getMinPurchaseAmount());
        discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        discount.setValidFrom(request.getValidFrom());
        discount.setValidTo(request.getValidTo());
        discount.setUsageLimit(request.getUsageLimit());
        discount.setActive(Boolean.TRUE.equals(request.getActive()));
        Discount saved = discountRepository.save(discount);
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse enablePromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        discount.setActive(true);
        Discount saved = discountRepository.save(discount);
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse disablePromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        discount.setActive(false);
        Discount saved = discountRepository.save(discount);
        return DiscountResponse.fromDiscount(saved);
    }

    public Object getUsage(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        return java.util.Map.of(
                "promotionId", discount.getId(),
                "code", discount.getCode(),
                "usageCount", discount.getUsageCount(),
                "usageLimit", discount.getUsageLimit()
        );
    }

    private String normalizeType(String type) {
        return "PERCENT".equalsIgnoreCase(type) ? "PERCENTAGE" : type.trim().toUpperCase();
    }
}
