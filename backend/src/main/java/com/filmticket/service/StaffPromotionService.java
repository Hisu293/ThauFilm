package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.dto.StaffPromotionRequest;
import com.filmticket.entity.Discount;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
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
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class StaffPromotionService {

    private final DiscountRepository discountRepository;
    private final AuditLogService auditLogService;
    private final PaymentRepository paymentRepository;

    public List<DiscountResponse> listPromotions() {
        return discountRepository.findAll().stream()
                .map(DiscountResponse::fromDiscount)
                .toList();
    }

    public DiscountResponse getPromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        return DiscountResponse.fromDiscount(discount);
    }

    @Transactional
    public DiscountResponse createPromotion(StaffPromotionRequest request) {
        validateRequest(request, null);
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
        applyCampaignConditions(discount, request);
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
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        validateRequest(request, promotionId);
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
        applyCampaignConditions(discount, request);
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
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        discount.setActive(true);
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditAction.VOUCHER_UPDATED, "VOUCHER", saved.getId(),
                "Đã kích hoạt voucher \"" + saved.getCode() + "\"");
        return DiscountResponse.fromDiscount(saved);
    }

    @Transactional
    public DiscountResponse disablePromotion(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        discount.setActive(false);
        Discount saved = discountRepository.save(discount);
        auditLogService.success(AuditAction.VOUCHER_UPDATED, "VOUCHER", saved.getId(),
                "Đã ngừng sử dụng voucher \"" + saved.getCode() + "\"");
        return DiscountResponse.fromDiscount(saved);
    }

    public Object getUsage(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        return java.util.Map.of(
                "promotionId", discount.getId(),
                "code", discount.getCode(),
                "usageCount", discount.getUsageCount(),
                "usageLimit", discount.getUsageLimit()
        );
    }

    public Map<String, Object> getDashboard(UUID promotionId) {
        Discount discount = discountRepository.findById(promotionId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi"));
        List<Payment> payments = paymentRepository.findAllByDiscountId(promotionId);
        long held = payments.stream().filter(p -> p.getStatus() == PaymentStatus.PENDING).count();
        long used = payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID).count();
        long failed = payments.stream().filter(p -> p.getStatus() == PaymentStatus.FAILED).count();
        BigDecimal revenueBefore = payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(p -> p.getOriginalAmount() == null ? p.getAmount() : p.getOriginalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal revenueAfter = payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal spent = payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(p -> p.getDiscountAmount() == null ? BigDecimal.ZERO : p.getDiscountAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long attempts = held + used + failed;
        BigDecimal conversionRate = attempts == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(used * 100.0 / attempts).setScale(1, RoundingMode.HALF_UP);
        List<Map<String, Object>> bookings = payments.stream()
                .sorted(java.util.Comparator.comparing(Payment::getCreatedAt).reversed())
                .limit(50)
                .map(payment -> {
                    Map<String, Object> row = new java.util.LinkedHashMap<>();
                    row.put("bookingId", payment.getBookingId());
                    row.put("paymentId", payment.getId());
                    row.put("originalAmount", payment.getOriginalAmount());
                    row.put("discountAmount", payment.getDiscountAmount());
                    row.put("paidAmount", payment.getAmount());
                    row.put("status", payment.getStatus());
                    row.put("createdAt", payment.getCreatedAt());
                    return row;
                }).toList();
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("promotionId", discount.getId());
        result.put("code", discount.getCode());
        result.put("heldCount", held);
        result.put("usedCount", used);
        result.put("failedCount", failed);
        result.put("revenueBeforeDiscount", revenueBefore);
        result.put("revenueAfterDiscount", revenueAfter);
        result.put("budgetLimit", discount.getBudgetLimit());
        result.put("budgetUsed", spent);
        result.put("conversionRate", conversionRate);
        result.put("bookings", bookings);
        return result;
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
            throw new BadRequestException("Loại khuyến mãi không được hỗ trợ: " + type);
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
            default -> throw new BadRequestException("Loại ghế không được hỗ trợ: " + rawSeatType);
        };
    }

    private void validateRequest(StaffPromotionRequest request, UUID currentId) {
        String code = request.getCode() == null ? "" : request.getCode().trim().toUpperCase(Locale.ROOT);
        discountRepository.findByCode(code).filter(existing -> !existing.getId().equals(currentId)).ifPresent(existing -> {
            throw new BadRequestException("Mã khuyến mãi đã tồn tại");
        });
        if (request.getValidFrom() == null || request.getValidTo() == null) {
            throw new BadRequestException("Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc");
        }
        if (!request.getValidTo().isAfter(request.getValidFrom())) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (request.getUsageLimit() == null || request.getUsageLimit() < 1) {
            throw new BadRequestException("Tổng lượt sử dụng phải từ 1 trở lên");
        }
        if (request.getPerUserLimit() != null && request.getPerUserLimit() > request.getUsageLimit()) {
            throw new BadRequestException("Giới hạn mỗi thành viên không được lớn hơn tổng lượt sử dụng");
        }
        if ("PERCENTAGE".equalsIgnoreCase(request.getType())
                && request.getValue() != null && request.getValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Mức giảm theo phần trăm không được vượt quá 100%");
        }
    }

    private void applyCampaignConditions(Discount discount, StaffPromotionRequest request) {
        discount.setMinimumMemberTier(normalizeEnum(request.getMinimumMemberTier(), "V_STAR",
                Set.of("V_STAR", "V_DIAMOND", "V_PLATINUM"), "hạng thành viên"));
        discount.setCustomerSegment(normalizeEnum(request.getCustomerSegment(), "ALL",
                Set.of("ALL", "NEW", "RETURNING"), "nhóm khách hàng"));
        discount.setApplicableChannels(normalizeCsv(request.getApplicableChannels(), "CINEMA"));
        discount.setApplicableWeekdays(normalizeCsv(request.getApplicableWeekdays(), null));
        discount.setApplicableMovieIds(normalizeCsv(request.getApplicableMovieIds(), null));
        discount.setApplicableGenres(normalizeCsv(request.getApplicableGenres(), null));
        discount.setApplicableTheaterIds(normalizeCsv(request.getApplicableTheaterIds(), null));
        discount.setApplicableRoomIds(normalizeCsv(request.getApplicableRoomIds(), null));
        discount.setApplicableShowtimeIds(normalizeCsv(request.getApplicableShowtimeIds(), null));
        discount.setStartHour(request.getStartHour());
        discount.setEndHour(request.getEndHour());
        discount.setPerUserLimit(request.getPerUserLimit() == null ? 1 : request.getPerUserLimit());
        discount.setBudgetLimit(request.getBudgetLimit());
        if (discount.getBudgetUsed() == null) discount.setBudgetUsed(BigDecimal.ZERO);
    }

    private String normalizeEnum(String raw, String fallback, Set<String> allowed, String fieldName) {
        String value = raw == null || raw.isBlank() ? fallback : raw.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(value)) throw new BadRequestException("Giá trị " + fieldName + " không hợp lệ: " + raw);
        return value;
    }

    private String normalizeCsv(String raw, String fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        return Arrays.stream(raw.split(",")).map(String::trim).filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT)).distinct().collect(java.util.stream.Collectors.joining(","));
    }
}
