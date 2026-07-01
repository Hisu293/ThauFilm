package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SeatSuggestionResponse {
    private boolean exactMatch;
    private int requestedCount;
    private String message;
    private List<UUID> seatIds;
    private List<ShowtimeSeatResponse> seats;
}
