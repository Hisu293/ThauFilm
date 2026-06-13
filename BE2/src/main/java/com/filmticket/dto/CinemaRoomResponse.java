package com.filmticket.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoomResponse {
    private UUID id;
    private String name;
    private Integer capacity;
    private Integer status;
}
