package com.filmticket.dto;

import com.filmticket.entity.CinemaRoom;
import com.filmticket.model.RoomStatus;
import com.filmticket.model.RoomType;
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
    private RoomType type;
    private Integer capacity;
    private RoomStatus status;
    private UUID theaterId;
    private String theaterName;

    public static CinemaRoomResponse fromCinemaRoom(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .type(room.getType())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .theaterId(room.getTheaterId())
                .build();
    }
}
