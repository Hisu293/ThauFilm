package com.filmticket.dto;

import com.filmticket.entity.CinemaRoom;
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
    private UUID theaterId;
    private String theaterName;

    public static CinemaRoomResponse fromCinemaRoom(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .theaterId(room.getTheaterId())
                .build();
    }
}
