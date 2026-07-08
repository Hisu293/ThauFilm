package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComboRequest {
    @NotBlank(message = "Combo name is required")
    private String name;

    private String description;

    @NotNull(message = "Combo price is required")
    private BigDecimal price;
}
