package com.filmticket.service;

import com.filmticket.dto.TheaterDetailResponse;
import com.filmticket.dto.TheaterMovieResponse;
import com.filmticket.dto.TheaterRequest;
import com.filmticket.dto.TheaterResponse;
import com.filmticket.dto.TheaterWithRoomsResponse;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Theater;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TheaterService {

    private final TheaterRepository theaterRepository;
    private final ShowtimeRepository showtimeRepository;

    @Transactional(readOnly = true)
    public List<TheaterResponse> getAllActiveTheaters() {
        return theaterRepository.findByStatus(1).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheaterResponse> getAllTheaters() {
        return theaterRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TheaterResponse getTheaterById(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        return toResponse(theater);
    }

    @Transactional(readOnly = true)
    public TheaterWithRoomsResponse getTheaterWithRooms(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        return toWithRoomsResponse(theater);
    }

    @Transactional(readOnly = true)
    public TheaterDetailResponse getTheaterDetail(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        return TheaterDetailResponse.fromTheater(theater);
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getRoomsByTheater(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        return theater.getCinemaRooms().stream()
                .filter(room -> room.getStatus() == 1)
                .map(this::toCinemaRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Theater getTheaterEntityOrThrow(UUID theaterId) {
        return theaterRepository.findById(theaterId)
                .orElseThrow(() -> new BadRequestException("Theater not found"));
    }

    @Transactional
    public TheaterResponse createTheater(TheaterRequest request) {
        Theater theater = Theater.builder()
                .name(request.getName())
                .address(request.getAddress())
                .city(request.getCity())
                .phoneNumber(request.getPhoneNumber())
                .status(request.getStatus() != null ? request.getStatus() : 1)
                .build();

        Theater saved = theaterRepository.save(theater);
        return toResponse(saved);
    }

    @Transactional
    public TheaterResponse updateTheater(UUID theaterId, TheaterRequest request) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        theater.setName(request.getName());
        theater.setAddress(request.getAddress());
        theater.setCity(request.getCity());
        theater.setPhoneNumber(request.getPhoneNumber());
        if (request.getStatus() != null) {
            theater.setStatus(request.getStatus());
        }

        Theater saved = theaterRepository.save(theater);
        return toResponse(saved);
    }

    @Transactional
    public void deleteTheater(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        theater.setStatus(0);
        theaterRepository.save(theater);
    }

    @Transactional(readOnly = true)
    public List<TheaterMovieResponse> getTheatersShowingMovie(UUID movieId) {
        List<UUID> theaterIds = showtimeRepository.findDistinctTheaterIdsByMovieId(movieId);
        
        return theaterIds.stream()
                .map(theaterRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .map(this::toTheaterMovieResponse)
                .collect(Collectors.toList());
    }

    private TheaterResponse toResponse(Theater theater) {
        return TheaterResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .city(theater.getCity())
                .phoneNumber(theater.getPhoneNumber())
                .status(theater.getStatus())
                .build();
    }

    private TheaterWithRoomsResponse toWithRoomsResponse(Theater theater) {
        List<CinemaRoomResponse> rooms = theater.getCinemaRooms().stream()
                .filter(room -> room.getStatus() == 1)
                .map(this::toCinemaRoomResponse)
                .collect(Collectors.toList());

        return TheaterWithRoomsResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .city(theater.getCity())
                .phoneNumber(theater.getPhoneNumber())
                .status(theater.getStatus())
                .cinemaRooms(rooms)
                .build();
    }

    private CinemaRoomResponse toCinemaRoomResponse(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .theaterId(room.getTheater() != null ? room.getTheater().getId() : null)
                .theaterName(room.getTheater() != null ? room.getTheater().getName() : null)
                .build();
    }

    private TheaterMovieResponse toTheaterMovieResponse(Theater theater) {
        return TheaterMovieResponse.builder()
                .theaterId(theater.getId())
                .theaterName(theater.getName())
                .address(theater.getAddress())
                .build();
    }
}
