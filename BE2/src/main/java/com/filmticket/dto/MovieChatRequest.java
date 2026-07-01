package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MovieChatRequest {
    @NotBlank(message = "Message is required")
    private String message;
}
