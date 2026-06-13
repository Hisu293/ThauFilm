package com.filmticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CinemaRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    @NotNull(message = "Theater ID is required")
    private java.util.UUID theaterId;

    @NotNull(message = "Rows count is required")
    @Min(value = 1, message = "Rows count must be greater than 0")
    private Integer rowsCount;

    @NotNull(message = "Seats per row is required")
    @Min(value = 1, message = "Seats per row must be greater than 0")
    private Integer seatsPerRow;
}
