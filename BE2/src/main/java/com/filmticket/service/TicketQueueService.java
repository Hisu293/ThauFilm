package com.filmticket.service;

import com.filmticket.dto.TicketQueueStatusResponse;
import com.filmticket.entity.Movie;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class TicketQueueService {
    private static final BigDecimal HOT_RATING = BigDecimal.valueOf(8.5);
    private static final int ESTIMATED_SECONDS_PER_PERSON = 2;
    private static final int ADMIT_RATE_PER_SECOND = 8;
    private static final Duration TOKEN_TTL = Duration.ofMinutes(15);

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final Map<UUID, ShowtimeQueue> queues = new ConcurrentHashMap<>();

    public TicketQueueStatusResponse join(UUID showtimeId) {
        Showtime showtime = requireShowtime(showtimeId);
        if (!isQueueRequired(showtime)) {
            return TicketQueueStatusResponse.builder()
                    .queueRequired(false)
                    .admitted(true)
                    .showtimeId(showtimeId)
                    .position(0)
                    .estimatedWaitSeconds(0)
                    .message("Suất chiếu chưa cần xếp hàng.")
                    .build();
        }

        ShowtimeQueue queue = queues.computeIfAbsent(showtimeId, ignored -> new ShowtimeQueue(baseLoad(showtime)));
        cleanup(queue);
        String token = UUID.randomUUID().toString();
        int position = queue.nextPosition.incrementAndGet();
        QueueEntry entry = new QueueEntry(token, position, Instant.now());
        queue.entries.put(token, entry);
        return toResponse(showtimeId, entry, false);
    }

    public TicketQueueStatusResponse status(UUID showtimeId, String token) {
        ShowtimeQueue queue = queues.get(showtimeId);
        if (queue == null || token == null || token.isBlank()) {
            return TicketQueueStatusResponse.builder()
                    .queueRequired(false)
                    .admitted(true)
                    .showtimeId(showtimeId)
                    .position(0)
                    .estimatedWaitSeconds(0)
                    .message("Bạn đã được vào chọn ghế.")
                    .build();
        }
        cleanup(queue);
        QueueEntry entry = queue.entries.get(token);
        if (entry == null) {
            return TicketQueueStatusResponse.builder()
                    .queueRequired(true)
                    .admitted(false)
                    .showtimeId(showtimeId)
                    .token(token)
                    .position(1)
                    .estimatedWaitSeconds(5)
                    .message("Phiên xếp hàng đã hết hạn, vui lòng vào lại hàng đợi.")
                    .build();
        }
        boolean admitted = currentPosition(entry) <= 0;
        if (admitted) {
            queue.entries.remove(token);
        }
        return toResponse(showtimeId, entry, admitted);
    }

    private Showtime requireShowtime(UUID showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Showtime not found"));
    }

    private boolean isQueueRequired(Showtime showtime) {
        Movie movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
        boolean hotMovie = movie != null && movie.getRating() != null && movie.getRating().compareTo(HOT_RATING) >= 0;
        if (hotMovie) return true;

        java.util.List<SeatAvailability> seats = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtime.getId());
        if (seats.isEmpty()) return false;
        long available = seats.stream().filter(seat -> seat.getStatus() == SeatBookingStatus.AVAILABLE).count();
        return available > 0 && available <= Math.ceil(seats.size() * 0.25);
    }

    private int baseLoad(Showtime showtime) {
        Movie movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
        if (movie == null || movie.getRating() == null) return 60;
        int ratingBoost = movie.getRating().subtract(BigDecimal.valueOf(8)).max(BigDecimal.ZERO)
                .multiply(BigDecimal.valueOf(70)).intValue();
        return Math.max(60, Math.min(180, 80 + ratingBoost));
    }

    private TicketQueueStatusResponse toResponse(UUID showtimeId, QueueEntry entry, boolean admitted) {
        int position = admitted ? 0 : Math.max(1, currentPosition(entry));
        int waitSeconds = admitted ? 0 : Math.max(5, position * ESTIMATED_SECONDS_PER_PERSON);
        return TicketQueueStatusResponse.builder()
                .queueRequired(true)
                .admitted(admitted)
                .showtimeId(showtimeId)
                .token(entry.token())
                .position(position)
                .estimatedWaitSeconds(waitSeconds)
                .message(admitted ? "Đã đến lượt bạn. Bạn có thể chọn ghế." : "Bạn đang ở trong hàng đợi mở bán vé.")
                .build();
    }

    private int currentPosition(QueueEntry entry) {
        long elapsedSeconds = Math.max(0, Duration.between(entry.joinedAt(), Instant.now()).toSeconds());
        return entry.initialPosition() - (int) elapsedSeconds * ADMIT_RATE_PER_SECOND;
    }

    private void cleanup(ShowtimeQueue queue) {
        Instant cutoff = Instant.now().minus(TOKEN_TTL);
        queue.entries.values().stream()
                .filter(entry -> entry.joinedAt().isBefore(cutoff) || currentPosition(entry) <= -50)
                .map(QueueEntry::token)
                .toList()
                .forEach(queue.entries::remove);
        queue.entries.values().stream()
                .max(Comparator.comparingInt(QueueEntry::initialPosition))
                .ifPresentOrElse(
                        entry -> queue.nextPosition.updateAndGet(current -> Math.max(current, entry.initialPosition())),
                        () -> queue.nextPosition.set(queue.baseLoad())
                );
    }

    private record ShowtimeQueue(int baseLoad, AtomicInteger nextPosition, Map<String, QueueEntry> entries) {
        private ShowtimeQueue(int baseLoad) {
            this(baseLoad, new AtomicInteger(baseLoad), new ConcurrentHashMap<>());
        }
    }

    private record QueueEntry(String token, int initialPosition, Instant joinedAt) {}
}
