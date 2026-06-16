package com.filmticket.service;

import com.filmticket.dto.CinemaRoomResponse;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Seat;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
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
    private final MovieService movieService;
    private final CinemaRoomService cinemaRoomService;
    private final TheaterService theaterService;
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
        Movie movie = movieService.getMovieEntityOrThrow(request.getMovieId());
        CinemaRoom room = cinemaRoomService.getRoomEntityOrThrow(request.getCinemaRoomId());
        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), request.getEndTime(), null);

        Showtime showtime = Showtime.builder()
                .movie(movie)
                .cinemaRoom(room)
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
        Movie movie = movieService.getMovieEntityOrThrow(request.getMovieId());
        CinemaRoom room = cinemaRoomService.getRoomEntityOrThrow(request.getCinemaRoomId());
        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), request.getEndTime(), showtimeId);

        showtime.setMovie(movie);
        showtime.setCinemaRoom(room);
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
        movieService.getMovieEntityOrThrow(movieId);
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
        movieService.getMovieEntityOrThrow(movieId);
        return showtimeRepository.findByMovieIdAndDate(movieId, date).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByTheater(UUID theaterId) {
        theaterService.getTheaterEntityOrThrow(theaterId);
        return showtimeRepository.findByTheaterId(theaterId).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndTheater(UUID movieId, UUID theaterId) {
        movieService.getMovieEntityOrThrow(movieId);
        theaterService.getTheaterEntityOrThrow(theaterId);
        return showtimeRepository.findByTheaterIdAndMovieId(theaterId, movieId).stream()
                .map(ShowtimeResponse::fromShowtime)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getCinemasByMovie(UUID movieId) {
        movieService.getMovieEntityOrThrow(movieId);
        return showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId).stream()
                .map(s -> s.getCinemaRoom())
                .distinct()
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
        movieService.getMovieEntityOrThrow(movieId);
        return showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId).stream()
                .map(s -> s.getStartTime().toLocalDate())
                .distinct()
                .sorted()
                .toList();
    }

    private void ensureSeatAvailabilities(Showtime showtime) {
        List<SeatAvailability> existing = seatAvailabilityRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtime.getId());
        if (existing.isEmpty()) {
            List<Seat> seats = seatRepository.findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(showtime.getCinemaRoom().getId());
            List<SeatAvailability> newAvailabilities = seats.stream()
                    .map(seat -> SeatAvailability.builder()
                            .showtime(showtime)
                            .seat(seat)
                            .available(true)
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

    private void validateNoOverlap(UUID cinemaRoomId, java.time.LocalDateTime startTime, java.time.LocalDateTime endTime, UUID excludeId) {
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
