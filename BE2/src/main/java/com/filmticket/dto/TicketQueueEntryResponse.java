package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class TicketQueueEntryResponse {
    private UUID userId;
    private String displayName;
    private String email;
    private int position;
    private boolean currentUser;
    private boolean admitted;
    private Instant joinedAt;
}
