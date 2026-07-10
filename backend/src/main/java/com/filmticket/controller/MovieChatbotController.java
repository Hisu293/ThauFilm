package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieChatRequest;
import com.filmticket.dto.MovieChatResponse;
import com.filmticket.service.MovieChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/movie-chatbot")
@RequiredArgsConstructor
public class MovieChatbotController {
    private final MovieChatbotService movieChatbotService;

    @PostMapping
    public ResponseEntity<ApiResponse<MovieChatResponse>> chat(@Valid @RequestBody MovieChatRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Movie recommendations generated successfully",
                movieChatbotService.chat(request.getMessage(), request.getHistory())
        ));
    }
}
