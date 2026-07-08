package com.filmticket.dto;

import com.filmticket.model.TheaterStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterResponse {
    private UUID id;
    private String name;
    private String address;
    private String city;
    private String phoneNumber;
    private TheaterStatus status;
}
