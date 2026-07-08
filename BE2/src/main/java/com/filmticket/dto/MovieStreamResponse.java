package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class MovieStreamResponse {
    UUID movieId;
    String title;
    String streamUrl;
    Instant expiresAt;
    String provider;
}
