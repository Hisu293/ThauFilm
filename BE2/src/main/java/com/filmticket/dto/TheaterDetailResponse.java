package com.filmticket.dto;

import com.filmticket.entity.Theater;
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
    private Integer status;
    private java.util.List<CinemaRoomResponse> cinemaRooms;

    public static TheaterDetailResponse fromTheater(Theater theater) {
        return TheaterDetailResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .city(theater.getCity())
                .phoneNumber(theater.getPhoneNumber())
                .status(theater.getStatus())
                .cinemaRooms(theater.getCinemaRooms() != null 
                        ? theater.getCinemaRooms().stream()
                                .map(CinemaRoomResponse::fromCinemaRoom)
                                .toList()
                        : null)
                .build();
    }
}
