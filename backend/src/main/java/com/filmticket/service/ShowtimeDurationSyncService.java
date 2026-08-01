package com.filmticket.service;

import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShowtimeDurationSyncService {
    private static final int CLEANUP_MINUTES = 1;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ShowtimeRepository showtimeRepository;

    public void syncFutureShowtimes(UUID movieId, Integer oldDuration, Integer newDuration, boolean confirmed) {
        if (java.util.Objects.equals(oldDuration, newDuration)) return;

        List<Showtime> future = showtimeRepository
                .findByMovieIdAndStartTimeAfterOrderByStartTimeAsc(movieId, LocalDateTime.now(VIETNAM_ZONE))
                .stream()
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .toList();
        if (future.isEmpty()) return;
        if (!confirmed) {
            throw new BadRequestException("Thay đổi thời lượng sẽ ảnh hưởng " + future.size()
                    + " suất chiếu tương lai. Hãy xác nhận cập nhật lại endTime.");
        }

        for (Showtime showtime : future) {
            LocalDateTime newEndTime = showtime.getStartTime().plusMinutes(newDuration + CLEANUP_MINUTES);
            if (!showtime.isOnline() && showtime.getCinemaRoomId() != null
                    && !showtimeRepository.findOverlappingShowtimesExcluding(
                    showtime.getCinemaRoomId(), showtime.getStartTime(), newEndTime, showtime.getId()).isEmpty()) {
                throw new BadRequestException("Thời lượng mới làm trùng lịch phòng chiếu tại suất "
                        + showtime.getStartTime() + ". Vui lòng điều chỉnh lịch trước.");
            }
            showtime.setEndTime(newEndTime);
        }
        showtimeRepository.saveAll(future);
    }
}
