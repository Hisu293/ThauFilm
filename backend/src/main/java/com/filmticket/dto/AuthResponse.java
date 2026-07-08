package com.filmticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String type;
    private UUID userId;
    private String email;
    private String fullName;
    private String role;
    private String provider;
    private String avatarUrl;
}
