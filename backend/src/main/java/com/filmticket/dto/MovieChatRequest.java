package com.filmticket.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class MovieChatRequest {
    @NotBlank(message = "Message is required")
    private String message;

    private List<ChatTurn> history;

    @Data
    public static class ChatTurn {
        private String role;
        private String message;
    }
}
