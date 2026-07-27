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
import com.filmticket.model.RoomStatus;
import com.filmticket.model.TheaterStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
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
    private final CinemaRoomRepository cinemaRoomRepository;

    @Transactional(readOnly = true)
    public List<TheaterResponse> getTheatersByCity(String city) {
        // Gọi repository tìm các rạp thuộc City (không phân biệt hoa thường) và trạng thái ACTIVE
        return theaterRepository.findByCityIgnoreCaseAndStatus(city, TheaterStatus.ACTIVE).stream()
                .map(this::toResponse) // Map Entity sang DTO TheaterResponse giống các hàm trên của bạn
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheaterResponse> getAllActiveTheaters() {
        return theaterRepository.findByStatus(TheaterStatus.ACTIVE).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheaterResponse> getAllTheaters() {
        return theaterRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
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
        if (!theaterRepository.existsById(theaterId)) {
            throw new BadRequestException("Theater not found");
        }
        return cinemaRoomRepository.findByTheaterId(theaterId).stream()
                .filter(room -> room.getStatus() == RoomStatus.ACTIVE)
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
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : TheaterStatus.ACTIVE)
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
        theater.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) {
            theater.setStatus(request.getStatus());
        }

        Theater saved = theaterRepository.save(theater);
        return toResponse(saved);
    }

    @Transactional
    public void deleteTheater(UUID theaterId) {
        Theater theater = getTheaterEntityOrThrow(theaterId);
        theater.setStatus(TheaterStatus.INACTIVE);
        theaterRepository.save(theater);
    }

    @Transactional(readOnly = true)
    public List<TheaterMovieResponse> getTheatersShowingMovie(UUID movieId) {
        List<UUID> roomIds = showtimeRepository.findDistinctCinemaRoomIdsByMovieId(movieId);
        List<UUID> theaterIds = roomIds.stream()
                .map(cinemaRoomRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .map(CinemaRoom::getTheaterId)
                .distinct()
                .toList();

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
                .imageUrl(theater.getImageUrl())
                .status(theater.getStatus())
                .build();
    }

    private TheaterWithRoomsResponse toWithRoomsResponse(Theater theater) {
        List<CinemaRoomResponse> rooms = cinemaRoomRepository.findByTheaterId(theater.getId()).stream()
                .filter(room -> room.getStatus() == RoomStatus.ACTIVE)
                .map(this::toCinemaRoomResponse)
                .toList();

        return TheaterWithRoomsResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .city(theater.getCity())
                .phoneNumber(theater.getPhoneNumber())
                .imageUrl(theater.getImageUrl())
                .status(theater.getStatus())
                .cinemaRooms(rooms)
                .build();
    }

    private CinemaRoomResponse toCinemaRoomResponse(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .type(room.getType())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .theaterId(room.getTheaterId())
                .build();
    }

    private TheaterMovieResponse toTheaterMovieResponse(Theater theater) {
        return TheaterMovieResponse.builder()
                .theaterId(theater.getId())
                .theaterName(theater.getName())
                .address(theater.getAddress())
                .imageUrl(theater.getImageUrl())
                .build();
    }
}
