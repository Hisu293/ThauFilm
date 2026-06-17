package com.filmticket.service;

import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.dto.ShowtimeSeatResponse;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeService showtimeService;
    private final SeatAvailabilityRepository seatAvailabilityRepository;

    public List<ShowtimeResponse> listShowtimes() {
        return showtimeService.getAllShowtimes();
    }

    public ShowtimeResponse createShowtime(UpsertShowtimeRequest request) {
        return showtimeService.createShowtime(request);
    }

    public ShowtimeResponse updateShowtime(UUID showtimeId, UpsertShowtimeRequest request) {
        return showtimeService.updateShowtime(showtimeId, request);
    }

    @Transactional
    public void cancelShowtime(UUID showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Showtime not found"));
        showtime.setStatus(0);
        showtimeRepository.save(showtime);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getShowtimeSeats(UUID showtimeId) {
        List<SeatAvailability> availabilities = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        List<ShowtimeSeatResponse> seats = availabilities.stream()
                .map(ShowtimeSeatResponse::fromSeatAvailability)
                .toList();
        long sold = availabilities.stream().filter(av -> !av.isAvailable()).count();
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("showtimeId", showtimeId);
        result.put("totalSeats", availabilities.size());
        result.put("soldSeats", sold);
        result.put("availableSeats", availabilities.size() - sold);
        result.put("seats", seats);
        return result;
    }
}
