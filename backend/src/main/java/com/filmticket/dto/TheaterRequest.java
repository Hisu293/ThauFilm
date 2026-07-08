package com.filmticket.dto;

import com.filmticket.model.TheaterStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterRequest {
    @NotBlank(message = "Theater name is required")
    private String name;

    private String address;

    private String city;

    private String phoneNumber;

    private TheaterStatus status;
}
