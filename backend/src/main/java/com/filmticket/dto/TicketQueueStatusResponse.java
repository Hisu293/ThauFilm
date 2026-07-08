package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TicketQueueStatusResponse {
    private boolean queueRequired;
    private boolean admitted;
    private UUID showtimeId;
    private UUID userId;
    private int position;
    private int estimatedWaitSeconds;
    private String message;
    private List<TicketQueueEntryResponse> entries;
}
