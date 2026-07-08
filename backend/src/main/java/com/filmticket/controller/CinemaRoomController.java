package com.filmticket.controller;

import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.service.CinemaRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class CinemaRoomController {

    private final CinemaRoomService cinemaRoomService;

    @GetMapping
    public ResponseEntity<List<CinemaRoomResponse>> getActiveRooms() {
        return ResponseEntity.ok(cinemaRoomService.getAllActiveRooms());
    }
}
