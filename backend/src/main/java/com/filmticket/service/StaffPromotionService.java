package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.dto.StaffPromotionRequest;
import com.filmticket.entity.Discount;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffPromotionService {

    private final DiscountRepository discountRepository;
    private final AuditLogService auditLogService;

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
        discount.setApplicableSeatTypes(normalizeApplicableSeatTypes(request.getApplicableSeatTypes()));
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.VOUCHER_CREATED).targetType("VOUCHER").targetId(saved.getId().toString())
                .description("Đã tạo voucher \"" + saved.getCode() + "\"")
                .newValues(voucherAuditValues(saved)).build());
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse updatePromotion(UUID promotionId, StaffPromotionRequest request) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        Map<String, Object> oldValues = voucherAuditValues(discount);
        discount.setName(request.getName());
        discount.setType(normalizeType(request.getType()));
        discount.setValue(request.getValue());
        discount.setMinPurchaseAmount(request.getMinPurchaseAmount());
        discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        discount.setValidFrom(request.getValidFrom());
        discount.setValidTo(request.getValidTo());
        discount.setUsageLimit(request.getUsageLimit());
        discount.setActive(Boolean.TRUE.equals(request.getActive()));
        discount.setApplicableSeatTypes(normalizeApplicableSeatTypes(request.getApplicableSeatTypes()));
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.VOUCHER_UPDATED).targetType("VOUCHER").targetId(saved.getId().toString())
                .description("Đã cập nhật voucher \"" + saved.getCode() + "\"")
                .oldValues(oldValues).newValues(voucherAuditValues(saved)).build());
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse enablePromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        discount.setActive(true);
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditAction.VOUCHER_UPDATED, "VOUCHER", saved.getId(),
                "Đã kích hoạt voucher \"" + saved.getCode() + "\"");
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse disablePromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Promotion not found"));
        discount.setActive(false);
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditAction.VOUCHER_UPDATED, "VOUCHER", saved.getId(),
                "Đã ngừng sử dụng voucher \"" + saved.getCode() + "\"");
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

    private Map<String, Object> voucherAuditValues(Discount discount) {
        Map<String, Object> values = new java.util.LinkedHashMap<>();
        values.put("mã", discount.getCode());
        values.put("tên", discount.getName());
        values.put("loại", discount.getType());
        values.put("giáTrị", discount.getValue());
        values.put("bắtĐầu", discount.getValidFrom());
        values.put("kếtThúc", discount.getValidTo());
        values.put("giớiHạnLượtDùng", discount.getUsageLimit());
        values.put("đangHoạtĐộng", discount.isActive());
        return values;
    }

    private String normalizeType(String type) {
        String normalized = "PERCENT".equalsIgnoreCase(type) ? "PERCENTAGE" : type.trim().toUpperCase();
        if (!Set.of("PERCENTAGE", "FIXED").contains(normalized)) {
            throw new BadRequestException("Unsupported promotion type: " + type);
        }
        return normalized;
    }

    private String normalizeApplicableSeatTypes(String applicableSeatTypes) {
        if (applicableSeatTypes == null || applicableSeatTypes.isBlank()) {
            return "STANDARD,VIP,COUPLE";
        }

        Set<String> normalized = new LinkedHashSet<>();
        Arrays.stream(applicableSeatTypes.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::normalizeSeatType)
                .forEach(normalized::add);

        if (normalized.isEmpty()) {
            return "STANDARD,VIP,COUPLE";
        }
        return String.join(",", normalized);
    }

    private String normalizeSeatType(String rawSeatType) {
        String value = rawSeatType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "STANDARD", "NORMAL", "REGULAR", "THUONG", "THƯỜNG" -> "STANDARD";
            case "VIP" -> "VIP";
            case "COUPLE", "DOUBLE", "DOI", "ĐÔI" -> "COUPLE";
            default -> throw new BadRequestException("Unsupported seat type: " + rawSeatType);
        };
    }
}
