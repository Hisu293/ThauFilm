package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayBookingRequest {
    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    private String discountCode;

    private UUID targetUserId;
}
