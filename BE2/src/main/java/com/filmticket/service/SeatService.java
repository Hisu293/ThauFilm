package com.filmticket.service;

import com.filmticket.dto.SeatResponse;
import com.filmticket.dto.UpsertSeatRequest;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Seat;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final SeatRepository seatRepository;
    private final CinemaRoomService cinemaRoomService;

    @Transactional
    public SeatResponse createSeat(@Valid UpsertSeatRequest request) {
        CinemaRoom room = cinemaRoomService.getRoomEntityOrThrow(request.getCinemaRoomId());
        validateUniqueSeat(request, null);

        Seat seat = Seat.builder()
                .cinemaRoom(room)
                .rowName(normalizeRowName(request.getRowName()))
                .seatNumber(request.getSeatNumber())
                .type(normalize(request.getType()))
                .status(request.getStatus())
                .build();

        return SeatResponse.fromSeat(seatRepository.save(seat));
    }

    @Transactional
    public SeatResponse updateSeat(UUID seatId, @Valid UpsertSeatRequest request) {
        Seat seat = getSeatEntityOrThrow(seatId);
        CinemaRoom room = cinemaRoomService.getRoomEntityOrThrow(request.getCinemaRoomId());
        validateUniqueSeat(request, seatId);

        seat.setCinemaRoom(room);
        seat.setRowName(normalizeRowName(request.getRowName()));
        seat.setSeatNumber(request.getSeatNumber());
        seat.setType(normalize(request.getType()));
        seat.setStatus(request.getStatus());

        return SeatResponse.fromSeat(seatRepository.save(seat));
    }

    @Transactional
    public void deleteSeat(UUID seatId) {
        seatRepository.delete(getSeatEntityOrThrow(seatId));
    }

    @Transactional(readOnly = true)
    public Seat getSeatEntityOrThrow(UUID seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new BadRequestException("Seat not found"));
    }

    private void validateUniqueSeat(UpsertSeatRequest request, UUID seatId) {
        String normalizedRowName = normalizeRowName(request.getRowName());
        boolean exists = seatId == null
                ? seatRepository.existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumber(
                        request.getCinemaRoomId(),
                        normalizedRowName,
                        request.getSeatNumber()
                )
                : seatRepository.existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumberAndIdNot(
                        request.getCinemaRoomId(),
                        normalizedRowName,
                        request.getSeatNumber(),
                        seatId
                );

        if (exists) {
            throw new BadRequestException("Seat already exists in this room");
        }
    }

    private String normalizeRowName(String value) {
        return normalize(value).toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
