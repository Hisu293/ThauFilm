package com.filmticket.service;

import com.filmticket.entity.GroupBooking;
import com.filmticket.entity.GroupBookingStatus;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.GroupBookingMemberRepository;
import com.filmticket.repository.GroupBookingRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class GroupBookingRealtimeService {
    private final GroupBookingRepository groupBookingRepository;
    private final GroupBookingMemberRepository memberRepository;
    private final SeatAvailabilityRepository availabilityRepository;
    private final RealtimeEventService realtimeEventService;
    private final Map<UUID, LinkedHashSet<UUID>> previews = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public List<UUID> subscribe(UUID groupId, UUID userId) {
        GroupBooking group = requireMember(groupId, userId);
        return group.getStatus() == GroupBookingStatus.WAITING_SELECTION ? snapshot(groupId) : List.of();
    }

    @Transactional(readOnly = true)
    public void toggleSeat(UUID groupId, UUID userId, UUID seatId) {
        GroupBooking group = requireWaitingGroup(groupId, userId);
        var availability = availabilityRepository.findByShowtimeIdAndSeatId(group.getShowtimeId(), seatId)
                .orElseThrow(() -> new BadRequestException("Ghế không thuộc suất chiếu này"));
        if (availability.getStatus() != SeatBookingStatus.AVAILABLE) {
            throw new BadRequestException("Ghế đã được giữ hoặc đã bán");
        }

        LinkedHashSet<UUID> selected = previews.computeIfAbsent(groupId, ignored -> new LinkedHashSet<>());
        List<UUID> selectedSeatIds;
        synchronized (selected) {
            if (!selected.remove(seatId)) {
                if (selected.size() >= 2) throw new BadRequestException("Chỉ được chọn tối đa 2 ghế");
                selected.add(seatId);
            }
            selectedSeatIds = List.copyOf(selected);
        }
        realtimeEventService.sendGroupEvent(groupId, "GROUP_SEAT_PREVIEW", Map.of(
                "groupId", groupId,
                "actorId", userId,
                "selectedSeatIds", selectedSeatIds
        ));
    }

    public List<UUID> snapshot(UUID groupId) {
        LinkedHashSet<UUID> selected = previews.get(groupId);
        if (selected == null) return List.of();
        synchronized (selected) { return List.copyOf(selected); }
    }

    public void clear(UUID groupId) {
        previews.remove(groupId);
        realtimeEventService.sendGroupEvent(groupId, "GROUP_SEAT_PREVIEW", Map.of(
                "groupId", groupId, "selectedSeatIds", List.of()));
    }

    private GroupBooking requireWaitingGroup(UUID groupId, UUID userId) {
        GroupBooking group = requireMember(groupId, userId);
        if (group.getStatus() != GroupBookingStatus.WAITING_SELECTION) {
            throw new BadRequestException("Booking nhóm không còn ở bước chọn ghế");
        }
        return group;
    }

    private GroupBooking requireMember(UUID groupId, UUID userId) {
        GroupBooking group = groupBookingRepository.findById(groupId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy booking nhóm"));
        if (memberRepository.findByGroupBookingIdAndUserId(groupId, userId).isEmpty()) {
            throw new BadRequestException("Bạn không thuộc booking nhóm này");
        }
        return group;
    }
}
