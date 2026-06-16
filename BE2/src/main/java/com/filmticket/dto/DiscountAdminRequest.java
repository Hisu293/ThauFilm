package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscountAdminRequest {
    @NotBlank(message = "Discount code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Type is required")
    private String type;

    @NotNull(message = "Value is required")
    private BigDecimal value;

    @NotNull(message = "Min purchase amount is required")
    private BigDecimal minPurchaseAmount;

    @NotNull(message = "Max discount amount is required")
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Valid from is required")
    private LocalDateTime validFrom;

    @NotNull(message = "Valid to is required")
    private LocalDateTime validTo;

    @NotNull(message = "Usage limit is required")
    private Integer usageLimit;

    private Boolean active;
}
