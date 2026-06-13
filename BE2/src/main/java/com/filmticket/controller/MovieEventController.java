package com.filmticket.controller;

import com.filmticket.service.MovieEventService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/events/movies")
@RequiredArgsConstructor
public class MovieEventController {

    private final MovieEventService movieEventService;

    @Operation(summary = "Subscribe to movie realtime updates")
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return movieEventService.subscribe();
    }
}
