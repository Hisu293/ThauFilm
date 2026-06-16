package com.filmticket.dto;

import com.filmticket.entity.Discount;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    private boolean active;

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
                .active(discount.isActive())
                .build();
    }
}
