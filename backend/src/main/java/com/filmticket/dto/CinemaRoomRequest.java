package com.filmticket.dto;

import com.filmticket.model.RoomType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    private RoomType type;

    @NotNull(message = "Theater ID is required")
    private java.util.UUID theaterId;

    @NotNull(message = "Rows count is required")
    @Min(value = 1, message = "Rows count must be greater than 0")
    private Integer rowsCount;

    @NotNull(message = "Seats per row is required")
    @Min(value = 1, message = "Seats per row must be greater than 0")
    private Integer seatsPerRow;

    @Min(0)
    private Integer standardSeats;
    @Min(0)
    private Integer vipSeats;
    @Min(0)
    private Integer coupleSeats;

    private BigDecimal standardPrice;
    private BigDecimal vipPrice;
    private BigDecimal couplePrice;
}
