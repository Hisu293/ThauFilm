package com.filmticket.dto;

import com.filmticket.model.RoomStatus;
import com.filmticket.model.RoomType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoomUpdateRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    private RoomType type;

    private RoomStatus status;
}