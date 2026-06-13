package com.filmticket.dto;

import com.filmticket.model.SeatStatus;
import com.filmticket.model.SeatType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSeatRequest {
    @NotNull(message = "Seat type is required")
    private SeatType type;

    @NotNull(message = "Seat status is required")
    private SeatStatus status;
}
