package com.filmticket.dto;

import com.filmticket.entity.Seat;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSeatRequest {
    @NotBlank(message = "Seat type is required")
    private String type;

    @NotBlank(message = "Seat status is required")
    private String status;

    public Seat.Type toSeatType() {
        return Seat.Type.fromStorageValue(type);
    }

    public Seat.Status toSeatStatus() {
        return Seat.Status.fromStorageValue(status);
    }
}
