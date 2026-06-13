package com.filmticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertSeatRequest {
    @NotNull(message = "Cinema room id is required")
    private UUID cinemaRoomId;

    @NotBlank(message = "Row name is required")
    private String rowName;

    @NotNull(message = "Seat number is required")
    @Min(value = 1, message = "Seat number must be greater than 0")
    private Integer seatNumber;

    @NotBlank(message = "Seat type is required")
    private String type;

    @NotNull(message = "Seat status is required")
    private Integer status;
}
