package com.filmticket.service;

import com.filmticket.dto.TicketQueueEntryResponse;
import com.filmticket.dto.TicketQueueStatusResponse;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.RoomType;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class TicketQueueService {
    private static final int ESTIMATED_SECONDS_PER_PERSON = 60;
    private static final Duration ENTRY_TTL = Duration.ofMinutes(30);
    private static final Duration ACTIVE_VIEWER_TTL = Duration.ofSeconds(90);
    private static final double LOW_AVAILABLE_SEAT_RATIO = 0.20;
    private static final int HOLDING_SEAT_THRESHOLD = 12;
    private static final int ACTIVE_VIEWER_THRESHOLD = 50;
    private static final int HOT_PREDICTION_THRESHOLD = 80;
    private static final int NEW_RELEASE_DAYS = 14;

    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final DemandPredictionService demandPredictionService;
    private final Map<UUID, ShowtimeQueue> queues = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public TicketQueueStatusResponse join(UUID showtimeId, UUID userId) {
        Showtime showtime = requireShowtime(showtimeId);
        User user = requireUser(userId);
        ShowtimeQueue queue = queues.computeIfAbsent(showtimeId, ignored -> new ShowtimeQueue());
        synchronized (queue) {
            Instant currentTime = now();
            cleanup(queue, currentTime);
            queue.activeViewers.put(userId, currentTime);
            QueueDecision decision = queueDecision(showtime, queue);
            if (!decision.required()) {
                queue.entries.remove(userId);
                return noQueueResponse(showtimeId, userId, decision.message());
            }
            queue.entries.computeIfAbsent(userId, ignored -> createQueueEntry(queue, user, currentTime));
            return toResponse(showtimeId, userId, queue, decision.message(), currentTime);
        }
    }

    @Transactional(readOnly = true)
    public TicketQueueStatusResponse status(UUID showtimeId, UUID userId) {
        Showtime showtime = requireShowtime(showtimeId);
        ShowtimeQueue queue = queues.computeIfAbsent(showtimeId, ignored -> new ShowtimeQueue());
        synchronized (queue) {
            Instant currentTime = now();
            cleanup(queue, currentTime);
            queue.activeViewers.put(userId, currentTime);
            QueueDecision decision = queueDecision(showtime, queue);
            if (!decision.required()) {
                queue.entries.remove(userId);
                return noQueueResponse(showtimeId, userId, decision.message());
            }
            if (!queue.entries.containsKey(userId)) {
                User user = requireUser(userId);
                queue.entries.put(userId, createQueueEntry(queue, user, currentTime));
            }
            return toResponse(showtimeId, userId, queue, decision.message(), currentTime);
        }
    }

    @Transactional(readOnly = true)
    public TicketQueueStatusResponse heartbeat(UUID showtimeId, UUID userId) {
        Showtime showtime = requireShowtime(showtimeId);
        ShowtimeQueue queue = queues.computeIfAbsent(showtimeId, ignored -> new ShowtimeQueue());
        synchronized (queue) {
            Instant currentTime = now();
            cleanup(queue, currentTime);
            queue.activeViewers.put(userId, currentTime);
            QueueDecision decision = queueDecision(showtime, queue);
            return noQueueResponse(showtimeId, userId, decision.required()
                    ? "Suất chiếu đang đông. Người mới vào sẽ được đưa vào hàng đợi."
                    : decision.message());
        }
    }

    @Transactional(readOnly = true)
    public TicketQueueStatusResponse leave(UUID showtimeId, UUID userId) {
        requireShowtime(showtimeId);
        ShowtimeQueue queue = queues.get(showtimeId);
        if (queue == null) {
            return noQueueResponse(showtimeId, userId, "Hàng đợi đang trống.");
        }
        synchronized (queue) {
            queue.entries.remove(userId);
            Instant currentTime = now();
            cleanup(queue, currentTime);
            if (queue.entries.isEmpty()) {
                return noQueueResponse(showtimeId, userId, "Bạn có thể vào chọn ghế.");
            }
            return toResponse(showtimeId, userId, queue, "Bạn đã rời hàng đợi.", currentTime);
        }
    }

    private Showtime requireShowtime(UUID showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Showtime not found"));
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private void cleanup(ShowtimeQueue queue, Instant currentTime) {
        queue.entries.values().removeIf(entry -> entry.admissionAt().plus(ENTRY_TTL).isBefore(currentTime));
        Instant activeCutoff = currentTime.minus(ACTIVE_VIEWER_TTL);
        queue.activeViewers.values().removeIf(lastSeen -> lastSeen.isBefore(activeCutoff));
    }

    private QueueEntry createQueueEntry(ShowtimeQueue queue, User user, Instant joinedAt) {
        Instant previousAdmission = queue.entries.values().stream()
                .map(QueueEntry::admissionAt)
                .max(Comparator.naturalOrder())
                .orElse(null);
        Instant admissionAt = previousAdmission == null
                ? joinedAt
                : max(joinedAt, previousAdmission.plusSeconds(ESTIMATED_SECONDS_PER_PERSON));
        return new QueueEntry(user.getId(), user.getFullName(), user.getEmail(), joinedAt, admissionAt);
    }

    private Instant max(Instant first, Instant second) {
        return first.isAfter(second) ? first : second;
    }

    private TicketQueueStatusResponse noQueueResponse(UUID showtimeId, UUID userId, String message) {
        return TicketQueueStatusResponse.builder()
                .queueRequired(false)
                .admitted(true)
                .showtimeId(showtimeId)
                .userId(userId)
                .position(0)
                .estimatedWaitSeconds(0)
                .message(message)
                .entries(List.of())
                .build();
    }

    private TicketQueueStatusResponse toResponse(
            UUID showtimeId,
            UUID currentUserId,
            ShowtimeQueue queue,
            String reason,
            Instant currentTime
    ) {
        List<QueueEntry> ordered = queue.entries.values().stream()
                .sorted(Comparator.comparing(QueueEntry::joinedAt))
                .toList();
        List<TicketQueueEntryResponse> entries = new ArrayList<>();
        int currentPosition = 0;

        for (int i = 0; i < ordered.size(); i += 1) {
            QueueEntry entry = ordered.get(i);
            int position = i + 1;
            boolean currentUser = entry.userId().equals(currentUserId);
            boolean admitted = !currentTime.isBefore(entry.admissionAt());
            if (currentUser) currentPosition = position;
            entries.add(TicketQueueEntryResponse.builder()
                    .userId(entry.userId())
                    .displayName(displayName(entry))
                    .email(entry.email())
                    .position(position)
                    .currentUser(currentUser)
                    .admitted(admitted)
                    .joinedAt(entry.joinedAt())
                    .build());
        }

        QueueEntry currentEntry = ordered.stream()
                .filter(entry -> entry.userId().equals(currentUserId))
                .findFirst()
                .orElse(null);
        boolean admitted = currentEntry != null && !currentTime.isBefore(currentEntry.admissionAt());
        int waitSeconds = currentEntry == null || admitted
                ? 0
                : Math.toIntExact(Duration.between(currentTime, currentEntry.admissionAt()).getSeconds());
        return TicketQueueStatusResponse.builder()
                .queueRequired(true)
                .admitted(admitted)
                .showtimeId(showtimeId)
                .userId(currentUserId)
                .position(currentPosition)
                .estimatedWaitSeconds(waitSeconds)
                .message(admitted ? "Đã đến lượt bạn. Bạn có thể vào chọn ghế." : reason)
                .entries(entries)
                .build();
    }

    private QueueDecision queueDecision(Showtime showtime, ShowtimeQueue queue) {
        if (showtime.isMystery()) {
            return new QueueDecision(true, "Mystery Movie Night luôn bật hàng đợi để tránh tranh ghế.");
        }

        SeatStats seatStats = seatStats(showtime.getId());
        if (seatStats.totalSeats() > 0) {
            double availableRatio = seatStats.availableSeats() / (double) seatStats.totalSeats();
            if (availableRatio <= LOW_AVAILABLE_SEAT_RATIO) {
                return new QueueDecision(true, "Suất chiếu sắp hết ghế, cần xếp hàng chọn ghế.");
            }
            if (seatStats.holdingSeats() >= HOLDING_SEAT_THRESHOLD) {
                return new QueueDecision(true, "Đang có nhiều ghế được giữ tạm thời.");
            }
        }

        if (queue.activeViewers.size() >= ACTIVE_VIEWER_THRESHOLD) {
            return new QueueDecision(true, "Có nhiều người đang xem/chọn ghế cho suất này.");
        }

        Movie movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
        if (movie != null && movie.getReleaseDate() != null) {
            LocalDate releaseDate = movie.getReleaseDate();
            LocalDate today = LocalDate.now();
            if (!releaseDate.isAfter(today) && !releaseDate.isBefore(today.minusDays(NEW_RELEASE_DAYS))) {
                return new QueueDecision(true, "Phim mới mở bán nên bật hàng đợi.");
            }
        }

        CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomId()).orElse(null);
        RoomType roomType = room != null && room.getType() != null ? room.getType() : RoomType.STANDARD;
        int predictedOccupancy = demandPredictionService.predictOccupancy(showtime.getMovieId(), showtime.getStartTime(), roomType);
        if (predictedOccupancy >= HOT_PREDICTION_THRESHOLD) {
            return new QueueDecision(true, "Suất chiếu được dự đoán có nhu cầu cao.");
        }

        LocalTime start = showtime.getStartTime().toLocalTime();
        if (!start.isBefore(LocalTime.of(18, 0)) && start.isBefore(LocalTime.of(22, 0)) && predictedOccupancy >= 70) {
            return new QueueDecision(true, "Suất chiếu giờ cao điểm có nhu cầu cao.");
        }

        return new QueueDecision(false, "Suất chiếu chưa cần hàng đợi.");
    }

    private SeatStats seatStats(UUID showtimeId) {
        List<SeatAvailability> seats = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        int total = seats.size();
        int available = 0;
        int holding = 0;
        for (SeatAvailability seat : seats) {
            if (seat.getStatus() == SeatBookingStatus.AVAILABLE) available += 1;
            if (seat.getStatus() == SeatBookingStatus.HOLDING) holding += 1;
        }
        return new SeatStats(total, available, holding);
    }

    private String displayName(QueueEntry entry) {
        if (entry.fullName() != null && !entry.fullName().isBlank()) return entry.fullName();
        if (entry.email() != null && !entry.email().isBlank()) return entry.email().split("@")[0];
        return "Thành viên";
    }

    protected Instant now() {
        return Instant.now();
    }

    private static class ShowtimeQueue {
        private final Map<UUID, QueueEntry> entries = new LinkedHashMap<>();
        private final Map<UUID, Instant> activeViewers = new LinkedHashMap<>();
    }

    private record QueueEntry(UUID userId, String fullName, String email, Instant joinedAt, Instant admissionAt) {}
    private record QueueDecision(boolean required, String message) {}
    private record SeatStats(int totalSeats, int availableSeats, int holdingSeats) {}
}
