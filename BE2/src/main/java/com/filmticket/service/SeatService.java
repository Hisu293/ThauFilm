package com.filmticket.service;

import com.filmticket.dto.SeatMapResponse;
import com.filmticket.dto.SeatResponse;
import com.filmticket.dto.UpdateSeatRequest;
import com.filmticket.dto.UpsertSeatRequest;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Seat;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatType;
import com.filmticket.repository.SeatRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final SeatRepository seatRepository;
    private final CinemaRoomService cinemaRoomService;

    @Transactional(readOnly = true)
    public SeatMapResponse getSeatMap(UUID roomId) {
        CinemaRoom room = cinemaRoomService.getRoomEntityOrThrow(roomId);
        List<Seat> seats = seatRepository.findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(roomId);

        Map<String, List<Seat>> seatsByRow = seats.stream()
                .collect(Collectors.groupingBy(Seat::getRowName));

        int totalRows = seatsByRow.size();
        int seatsPerRow = seatsByRow.isEmpty() ? 0 : seatsByRow.values().iterator().next().size();
        int totalSeats = seats.size();

        int standardCount = (int) seats.stream().filter(s -> "STANDARD".equalsIgnoreCase(s.getType())).count();
        int vipCount = (int) seats.stream().filter(s -> "VIP".equalsIgnoreCase(s.getType())).count();

        Map<String, SeatMapResponse.RowInfo> rowInfoMap = new LinkedHashMap<>();
        for (Map.Entry<String, List<Seat>> entry : seatsByRow.entrySet()) {
            List<Seat> rowSeats = entry.getValue();
            String type = rowSeats.stream()
                    .findFirst()
                    .map(Seat::getType)
                    .orElse("STANDARD");
            int availableCount = (int) rowSeats.stream()
                    .filter(s -> s.getStatus() != null && s.getStatus() == 1)
                    .count();

            rowInfoMap.put(entry.getKey(), SeatMapResponse.RowInfo.builder()
                    .rowName(entry.getKey())
                    .seatCount(rowSeats.size())
                    .type(type)
                    .availableSeats(availableCount)
                    .build());
        }

        return SeatMapResponse.builder()
                .roomId(room.getId())
                .roomName(room.getName())
                .totalRows(totalRows)
                .seatsPerRow(seatsPerRow)
                .totalSeats(totalSeats)
                .standardSeatCount(standardCount)
                .vipSeatCount(vipCount)
                .rows(rowInfoMap)
                .build();
    }

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
    public SeatResponse updateSeatTypeStatus(UUID seatId, UpdateSeatRequest request) {
        Seat seat = getSeatEntityOrThrow(seatId);

        seat.setType(request.getType().toStorageValue());
        seat.setStatus(request.getStatus().getValue());

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
