package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SeatSuggestionOptionResponse {
    private String rowName;
    private boolean exactMatch;
    private int seatCapacity;
    private List<UUID> seatIds;
    private List<ShowtimeSeatResponse> seats;
}
