package com.filmticket.service;

import com.filmticket.dto.CinemaRoomRequest;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.SeatResponse;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Seat;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
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

    private CinemaRoomResponse convertToResponse(CinemaRoom room) {
        return CinemaRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .capacity(room.getCapacity())
                .status(room.getStatus())
                .build();
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getAllActiveRooms() {
        return cinemaRoomRepository.findByStatus(1).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CinemaRoom getRoomEntityOrThrow(UUID roomId) {
        return cinemaRoomRepository.findById(roomId)
                .orElseThrow(() -> new BadRequestException("Cinema room not found"));
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
        int totalCapacity = request.getRowsCount() * request.getSeatsPerRow();

        CinemaRoom room = CinemaRoom.builder()
                .name(request.getName())
                .capacity(totalCapacity)
                .status(1)
                .build();

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);

        List<Seat> seats = new ArrayList<>();
        char startRow = 'A';

        for (int i = 0; i < request.getRowsCount(); i++) {
            String rowName = String.valueOf((char) (startRow + i));

            for (int j = 1; j <= request.getSeatsPerRow(); j++) {
                String seatType = (i >= 3) ? "VIP" : "STANDARD";

                Seat seat = Seat.builder()
                        .cinemaRoom(savedRoom)
                        .rowName(rowName)
                        .seatNumber(j)
                        .type(seatType)
                        .status(1)
                        .build();

                seats.add(seat);
            }
        }

        savedRoom.setSeats(seats);
        CinemaRoom finalRoom = cinemaRoomRepository.save(savedRoom);

        return convertToResponse(finalRoom);
    }
}
