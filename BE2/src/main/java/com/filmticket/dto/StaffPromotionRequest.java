package com.filmticket.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class StaffPromotionRequest {

    @NotBlank(message = "Promotion code is required")
    @Size(max = 50, message = "Promotion code is too long")
    private String code;

    @NotBlank(message = "Promotion name is required")
    @Size(max = 100, message = "Promotion name is too long")
    private String name;

    @NotBlank(message = "Promotion type is required")
    @Size(max = 20, message = "Promotion type is too long")
    private String type;

    @NotNull(message = "Value is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Value must be at least 0")
    private BigDecimal value;

    @NotNull(message = "Min purchase amount is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Min purchase amount must be at least 0")
    private BigDecimal minPurchaseAmount;

    @NotNull(message = "Max discount amount is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Max discount amount must be at least 0")
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Valid from is required")
    private LocalDateTime validFrom;

    @NotNull(message = "Valid to is required")
    private LocalDateTime validTo;

    @Min(value = 1, message = "Usage limit must be at least 1")
    private Integer usageLimit;

    @Builder.Default
    private Boolean active = true;
}
