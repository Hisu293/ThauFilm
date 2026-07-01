package com.filmticket.service;

import com.filmticket.dto.TicketQueueEntryResponse;
import com.filmticket.dto.TicketQueueStatusResponse;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
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

    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final Map<UUID, ShowtimeQueue> queues = new ConcurrentHashMap<>();

    public TicketQueueStatusResponse join(UUID showtimeId, UUID userId) {
        requireShowtime(showtimeId);
        User user = requireUser(userId);
        ShowtimeQueue queue = queues.computeIfAbsent(showtimeId, ignored -> new ShowtimeQueue());
        synchronized (queue) {
            cleanup(queue);
            queue.entries.computeIfAbsent(userId, ignored -> new QueueEntry(userId, user.getFullName(), user.getEmail(), Instant.now()));
            return toResponse(showtimeId, userId, queue);
        }
    }

    public TicketQueueStatusResponse status(UUID showtimeId, UUID userId) {
        requireShowtime(showtimeId);
        ShowtimeQueue queue = queues.get(showtimeId);
        if (queue == null) {
            return emptyResponse(showtimeId, userId);
        }
        synchronized (queue) {
            cleanup(queue);
            if (!queue.entries.containsKey(userId)) {
                User user = requireUser(userId);
                queue.entries.put(userId, new QueueEntry(userId, user.getFullName(), user.getEmail(), Instant.now()));
            }
            return toResponse(showtimeId, userId, queue);
        }
    }

    public TicketQueueStatusResponse leave(UUID showtimeId, UUID userId) {
        requireShowtime(showtimeId);
        ShowtimeQueue queue = queues.get(showtimeId);
        if (queue == null) {
            return emptyResponse(showtimeId, userId);
        }
        synchronized (queue) {
            queue.entries.remove(userId);
            cleanup(queue);
            if (queue.entries.isEmpty()) {
                queues.remove(showtimeId);
                return emptyResponse(showtimeId, userId);
            }
            return toResponse(showtimeId, userId, queue);
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

    private void cleanup(ShowtimeQueue queue) {
        Instant cutoff = Instant.now().minus(ENTRY_TTL);
        queue.entries.values().removeIf(entry -> entry.joinedAt().isBefore(cutoff));
    }

    private TicketQueueStatusResponse emptyResponse(UUID showtimeId, UUID userId) {
        return TicketQueueStatusResponse.builder()
                .queueRequired(false)
                .admitted(true)
                .showtimeId(showtimeId)
                .userId(userId)
                .position(0)
                .estimatedWaitSeconds(0)
                .message("Hàng đợi đang trống.")
                .entries(List.of())
                .build();
    }

    private TicketQueueStatusResponse toResponse(UUID showtimeId, UUID currentUserId, ShowtimeQueue queue) {
        List<QueueEntry> ordered = queue.entries.values().stream()
                .sorted(Comparator.comparing(QueueEntry::joinedAt))
                .toList();
        List<TicketQueueEntryResponse> entries = new ArrayList<>();
        int currentPosition = 0;

        for (int i = 0; i < ordered.size(); i += 1) {
            QueueEntry entry = ordered.get(i);
            int position = i + 1;
            boolean currentUser = entry.userId().equals(currentUserId);
            if (currentUser) currentPosition = position;
            entries.add(TicketQueueEntryResponse.builder()
                    .userId(entry.userId())
                    .displayName(displayName(entry))
                    .email(entry.email())
                    .position(position)
                    .currentUser(currentUser)
                    .admitted(position == 1)
                    .joinedAt(entry.joinedAt())
                    .build());
        }

        boolean admitted = currentPosition <= 1;
        int waitSeconds = Math.max(0, currentPosition - 1) * ESTIMATED_SECONDS_PER_PERSON;
        return TicketQueueStatusResponse.builder()
                .queueRequired(true)
                .admitted(admitted)
                .showtimeId(showtimeId)
                .userId(currentUserId)
                .position(currentPosition)
                .estimatedWaitSeconds(waitSeconds)
                .message(admitted ? "Đã đến lượt bạn. Bạn có thể vào chọn ghế." : "Bạn đang ở trong hàng đợi chọn ghế.")
                .entries(entries)
                .build();
    }

    private String displayName(QueueEntry entry) {
        if (entry.fullName() != null && !entry.fullName().isBlank()) return entry.fullName();
        if (entry.email() != null && !entry.email().isBlank()) return entry.email().split("@")[0];
        return "Thành viên";
    }

    private static class ShowtimeQueue {
        private final Map<UUID, QueueEntry> entries = new LinkedHashMap<>();
    }

    private record QueueEntry(UUID userId, String fullName, String email, Instant joinedAt) {}
}
