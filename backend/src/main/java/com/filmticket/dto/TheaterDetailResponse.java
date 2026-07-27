package com.filmticket.dto;

import com.filmticket.entity.Theater;
import com.filmticket.model.TheaterStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterDetailResponse {
    private UUID id;
    private String name;
    private String address;
    private String city;
    private String phoneNumber;
    private String imageUrl;
    private TheaterStatus status;

    public static TheaterDetailResponse fromTheater(Theater theater) {
        return TheaterDetailResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .city(theater.getCity())
                .phoneNumber(theater.getPhoneNumber())
                .imageUrl(theater.getImageUrl())
                .status(theater.getStatus())
                .build();
    }
}
