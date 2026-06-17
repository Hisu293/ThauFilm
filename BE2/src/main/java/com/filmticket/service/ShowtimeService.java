package com.filmticket.service;

import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.entity.Seat;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.SeatRepository;
import com.filmticket.repository.ShowtimeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final PricingService pricingService;

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getAllShowtimes() {
        return showtimeRepository.findAll().stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional
    public ShowtimeResponse createShowtime(@Valid UpsertShowtimeRequest request) {
        validateTimeRange(request);
        movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        cinemaRoomRepository.findById(request.getCinemaRoomId())
                .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), request.getEndTime(), null);

        Showtime showtime = Showtime.builder()
                .movieId(request.getMovieId())
                .cinemaRoomId(request.getCinemaRoomId())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(request.getStatus())
                .build();

        Showtime savedShowtime = showtimeRepository.save(showtime);
        ensureSeatAvailabilities(savedShowtime);
        return ShowtimeResponse.fromShowtime(savedShowtime);
    }

    @Transactional
    public ShowtimeResponse updateShowtime(UUID showtimeId, @Valid UpsertShowtimeRequest request) {
        validateTimeRange(request);
        Showtime showtime = getShowtimeEntityOrThrow(showtimeId);
        movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        cinemaRoomRepository.findById(request.getCinemaRoomId())
                .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), request.getEndTime(), showtimeId);

        showtime.setMovieId(request.getMovieId());
        showtime.setCinemaRoomId(request.getCinemaRoomId());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(request.getEndTime());
        showtime.setStatus(request.getStatus());

        Showtime savedShowtime = showtimeRepository.save(showtime);
        ensureSeatAvailabilities(savedShowtime);
        return ShowtimeResponse.fromShowtime(savedShowtime);
    }

    @Transactional
    public void deleteShowtime(UUID showtimeId) {
        showtimeRepository.delete(getShowtimeEntityOrThrow(showtimeId));
    }

    @Transactional(readOnly = true)
    public Showtime getShowtimeEntityOrThrow(UUID showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Showtime not found"));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovie(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByDate(java.time.LocalDate date) {
        return showtimeRepository.findByDate(date).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndDate(UUID movieId, java.time.LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return showtimeRepository.findByMovieIdAndDate(movieId, date).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByTheater(UUID theaterId) {
        return showtimeRepository.findByTheaterId(theaterId).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndTheater(UUID movieId, UUID theaterId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return showtimeRepository.findByTheaterIdAndMovieId(theaterId, movieId).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getCinemasByMovie(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        List<UUID> roomIds = showtimeRepository.findDistinctCinemaRoomIdsByMovieId(movieId);
        return roomIds.stream()
                .map(cinemaRoomRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .map(room -> CinemaRoomResponse.builder()
                        .id(room.getId())
                        .name(room.getName())
                        .capacity(room.getCapacity())
                        .status(room.getStatus())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LocalDate> getShowDatesByMovie(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId).stream()
                .map(s -> s.getStartTime().toLocalDate())
                .distinct()
                .sorted()
                .toList();
    }

    private void ensureSeatAvailabilities(Showtime showtime) {
        List<SeatAvailability> existing = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtime.getId());
        if (existing.isEmpty()) {
            List<Seat> seats = seatRepository
                    .findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(showtime.getCinemaRoomId());
            List<SeatAvailability> newAvailabilities = seats.stream()
                    .map(seat -> SeatAvailability.builder()
                            .showtimeId(showtime.getId())
                            .seatId(seat.getId())
                            .status(SeatBookingStatus.AVAILABLE)
                            .price(BigDecimal.ZERO)
                            .build())
                    .toList();
            seatAvailabilityRepository.saveAll(newAvailabilities);
            pricingService.applyDefaultPricing(newAvailabilities);
            seatAvailabilityRepository.saveAll(newAvailabilities);
        } else {
            pricingService.applyDefaultPricing(existing);
            seatAvailabilityRepository.saveAll(existing);
        }
    }

    private void validateTimeRange(UpsertShowtimeRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
    }

    private void validateNoOverlap(UUID cinemaRoomId, java.time.LocalDateTime startTime,
            java.time.LocalDateTime endTime, UUID excludeId) {
        boolean hasOverlap = excludeId == null
                ? !showtimeRepository.findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(
                        cinemaRoomId, endTime, startTime).isEmpty()
                : !showtimeRepository.findByCinemaRoomIdAndStartTimeLessThanAndEndTimeGreaterThanAndIdNot(
                        cinemaRoomId, endTime, startTime, excludeId).isEmpty();

        if (hasOverlap) {
            throw new BadRequestException("Showtime overlaps with an existing showtime in this room");
        }
    }
}
