package com.filmticket.dto;

import com.filmticket.entity.Seat;
import com.filmticket.model.SeatStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSeatRequest {
    @NotNull(message = "Seat type is required")
    private String type;

    @NotNull(message = "Seat status is required")
    private SeatStatus status;

    public Seat.Type toSeatType() {
        return Seat.Type.fromStorageValue(type);
    }
}
