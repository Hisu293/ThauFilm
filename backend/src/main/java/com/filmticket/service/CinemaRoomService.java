package com.filmticket.service;

import com.filmticket.dto.CinemaRoomRequest;
import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.CinemaRoomUpdateRequest;
import com.filmticket.dto.SeatResponse;
import com.filmticket.dto.SeatTypePriceConfigRequest;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CinemaRoomService {

    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final TheaterRepository theaterRepository;
    private final AuditLogService auditLogService;
    private final SeatTypePriceConfigService seatTypePriceConfigService;

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
        boolean customSeatCounts = request.getStandardSeats() != null
                || request.getVipSeats() != null || request.getCoupleSeats() != null;
        int standardSeats = request.getStandardSeats() == null ? 0 : request.getStandardSeats();
        int vipSeats = request.getVipSeats() == null ? 0 : request.getVipSeats();
        int coupleSeats = request.getCoupleSeats() == null ? 0 : request.getCoupleSeats();
        if (customSeatCounts && standardSeats + vipSeats + coupleSeats != totalCapacity) {
            throw new BadRequestException("Tổng số ghế thường, VIP và đôi phải bằng sức chứa phòng");
        }

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
                int seatIndex = i * request.getSeatsPerRow() + j;
                String seatType = customSeatCounts
                        ? seatIndex <= standardSeats ? "STANDARD"
                        : seatIndex <= standardSeats + vipSeats ? "VIP" : "COUPLE"
                        : i >= 4 ? "COUPLE" : i >= 2 ? "VIP" : "STANDARD";

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
        updateSeatPrice("STANDARD", request.getStandardPrice());
        updateSeatPrice("VIP", request.getVipPrice());
        updateSeatPrice("COUPLE", request.getCouplePrice());
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.CINEMA_ROOM_CREATED).targetType("CINEMA_ROOM")
                .targetId(savedRoom.getId().toString())
                .description("Đã tạo phòng chiếu \"" + savedRoom.getName() + "\"")
                .newValues(roomAuditValues(savedRoom))
                .theaterId(savedRoom.getTheaterId())
                .metadata(Map.of("sốHàng", request.getRowsCount(), "sốGhếMỗiHàng", request.getSeatsPerRow(),
                        "tổngSốGhế", seats.size())).build());
        return convertToResponse(savedRoom);
    }

    private void updateSeatPrice(String seatType, java.math.BigDecimal price) {
        if (price == null) return;
        if (price.signum() <= 0) throw new BadRequestException("Giá ghế phải lớn hơn 0");
        seatTypePriceConfigService.upsert(SeatTypePriceConfigRequest.builder()
                .seatType(seatType).price(price).build());
    }

    @Transactional
    public CinemaRoomResponse updateRoom(UUID roomId, CinemaRoomUpdateRequest request) {
        CinemaRoom room = getRoomEntityOrThrow(roomId);
        Map<String, Object> oldValues = roomAuditValues(room);

        room.setName(request.getName());
        if (request.getStatus() != null) {
            room.setStatus(request.getStatus());
        }

        CinemaRoom saved = cinemaRoomRepository.save(room);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.CINEMA_ROOM_UPDATED).targetType("CINEMA_ROOM")
                .targetId(saved.getId().toString())
                .description("Đã cập nhật phòng chiếu \"" + saved.getName() + "\"")
                .oldValues(oldValues).newValues(roomAuditValues(saved))
                .theaterId(saved.getTheaterId()).build());
        return convertToResponse(saved);
    }

    @Transactional
    public void deleteRoom(UUID roomId) {
        CinemaRoom room = getRoomEntityOrThrow(roomId);
        Map<String, Object> oldValues = roomAuditValues(room);
        room.setStatus(RoomStatus.INACTIVE);
        cinemaRoomRepository.save(room);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.CINEMA_ROOM_DELETED).targetType("CINEMA_ROOM")
                .targetId(roomId.toString())
                .description("Đã ngừng hoạt động phòng chiếu \"" + room.getName() + "\"")
                .oldValues(oldValues).newValues(roomAuditValues(room))
                .theaterId(room.getTheaterId()).build());
    }

    private Map<String, Object> roomAuditValues(CinemaRoom room) {
        Map<String, Object> values = new java.util.LinkedHashMap<>();
        values.put("tênPhòng", room.getName());
        values.put("loạiPhòng", room.getType());
        values.put("sứcChứa", room.getCapacity());
        values.put("trạngThái", room.getStatus());
        values.put("mãRạp", room.getTheaterId());
        return values;
    }
}
