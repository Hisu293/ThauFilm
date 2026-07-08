package com.filmticket.service;

import com.filmticket.dto.CinemaRoomRequest;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.CinemaRoomUpdateRequest;
import com.filmticket.dto.SeatResponse;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Seat;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.RoomStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.SeatRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CinemaRoomService {

    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final TheaterRepository theaterRepository;

    private CinemaRoomResponse convertToResponse(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .type(room.getType())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .theaterId(room.getTheaterId())
                .build();
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getAllActiveRooms() {
        return cinemaRoomRepository.findByStatus(RoomStatus.ACTIVE).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getAllRooms() {
        return cinemaRoomRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CinemaRoom getRoomEntityOrThrow(UUID roomId) {
        return cinemaRoomRepository.findById(roomId)
                .orElseThrow(() -> new BadRequestException("Cinema room not found"));
    }

    @Transactional(readOnly = true)
    public CinemaRoomResponse getRoomById(UUID roomId) {
        return convertToResponse(getRoomEntityOrThrow(roomId));
    }

    @Transactional(readOnly = true)
    public List<SeatResponse> getSeatsByRoomId(UUID roomId) {
        getRoomEntityOrThrow(roomId);
        return seatRepository.findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(roomId).stream()
                .map(SeatResponse::fromSeat)
                .toList();
    }

    @Transactional
    public CinemaRoomResponse createRoomAndGenerateSeats(CinemaRoomRequest request) {
        if (!theaterRepository.existsById(request.getTheaterId())) {
            throw new BadRequestException("Theater not found");
        }

        int totalCapacity = request.getRowsCount() * request.getSeatsPerRow();

        CinemaRoom room = CinemaRoom.builder()
                .name(request.getName())
                .type(request.getType())
                .capacity(totalCapacity)
                .status(RoomStatus.ACTIVE)
                .theaterId(request.getTheaterId())
                .build();

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);

        List<Seat> seats = new ArrayList<>();
        char startRow = 'A';

        for (int i = 0; i < request.getRowsCount(); i++) {
            String rowName = String.valueOf((char) (startRow + i));

            for (int j = 1; j <= request.getSeatsPerRow(); j++) {
                String seatType;
                if (i >= 4) {
                    seatType = "COUPLE";
                } else if (i >= 2) {
                    seatType = "VIP";
                } else {
                    seatType = "STANDARD";
                }

                Seat.Type type = Seat.Type.fromStorageValue(seatType);

                Seat seat = Seat.builder()
                        .cinemaRoomId(savedRoom.getId())
                        .rowName(rowName)
                        .seatNumber(j)
                        .type(type)
                        .status(Seat.Status.ACTIVE)
                        .build();

                seats.add(seat);
            }
        }

        seatRepository.saveAll(seats);

        return convertToResponse(savedRoom);
    }

    @Transactional
    public CinemaRoomResponse updateRoom(UUID roomId, CinemaRoomUpdateRequest request) {
        CinemaRoom room = getRoomEntityOrThrow(roomId);

        room.setName(request.getName());
        if (request.getStatus() != null) {
            room.setStatus(request.getStatus());
        }

        CinemaRoom saved = cinemaRoomRepository.save(room);
        return convertToResponse(saved);
    }

    @Transactional
    public void deleteRoom(UUID roomId) {
        CinemaRoom room = getRoomEntityOrThrow(roomId);
        room.setStatus(RoomStatus.INACTIVE);
        cinemaRoomRepository.save(room);
    }
}
