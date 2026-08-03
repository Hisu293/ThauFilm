package com.filmticket.dto;

import com.filmticket.entity.Discount;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscountResponse {
    private UUID id;
    private String code;
    private String name;
    private String type;
    private BigDecimal value;
    private BigDecimal minPurchaseAmount;
    private BigDecimal maxDiscountAmount;
    private LocalDateTime validFrom;
    private LocalDateTime validTo;
    private Integer usageLimit;
    private Integer usageCount;
    private boolean active;
    private String applicableSeatTypes;
    private String minimumMemberTier;
    private String customerSegment;
    private String applicableMovieIds;
    private String applicableGenres;
    private String applicableTheaterIds;
    private String applicableRoomIds;
    private String applicableShowtimeIds;
    private String applicableChannels;
    private String applicableWeekdays;
    private LocalTime startHour;
    private LocalTime endHour;
    private Integer perUserLimit;
    private BigDecimal budgetLimit;
    private BigDecimal budgetUsed;

    public static DiscountResponse fromDiscount(Discount discount) {
        return DiscountResponse.builder()
                .id(discount.getId())
                .code(discount.getCode())
                .name(discount.getName())
                .type(discount.getType())
                .value(discount.getValue())
                .minPurchaseAmount(discount.getMinPurchaseAmount())
                .maxDiscountAmount(discount.getMaxDiscountAmount())
                .validFrom(discount.getValidFrom())
                .validTo(discount.getValidTo())
                .usageLimit(discount.getUsageLimit())
                .usageCount(discount.getUsageCount())
                .active(discount.isActive())
                .applicableSeatTypes(discount.getApplicableSeatTypes())
                .minimumMemberTier(discount.getMinimumMemberTier())
                .customerSegment(discount.getCustomerSegment())
                .applicableMovieIds(discount.getApplicableMovieIds())
                .applicableGenres(discount.getApplicableGenres())
                .applicableTheaterIds(discount.getApplicableTheaterIds())
                .applicableRoomIds(discount.getApplicableRoomIds())
                .applicableShowtimeIds(discount.getApplicableShowtimeIds())
                .applicableChannels(discount.getApplicableChannels())
                .applicableWeekdays(discount.getApplicableWeekdays())
                .startHour(discount.getStartHour())
                .endHour(discount.getEndHour())
                .perUserLimit(discount.getPerUserLimit())
                .budgetLimit(discount.getBudgetLimit())
                .budgetUsed(discount.getBudgetUsed())
                .build();
    }
}
