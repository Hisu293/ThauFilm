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
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.SeatRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import com.filmticket.model.RoomStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final TheaterRepository theaterRepository;
    private final PricingService pricingService;

    private List<ShowtimeResponse> enrich(List<Showtime> showtimes) {
        if (showtimes.isEmpty()) return List.of();

        List<UUID> movieIds = showtimes.stream().map(Showtime::getMovieId).distinct().toList();
        List<UUID> roomIds = showtimes.stream().map(Showtime::getCinemaRoomId).distinct().toList();

        Map<UUID, String> movieTitleByMovieId = movieRepository.findAllById(movieIds).stream()
                .collect(Collectors.toMap(com.filmticket.entity.Movie::getId, com.filmticket.entity.Movie::getTitle));

        Map<UUID, com.filmticket.entity.CinemaRoom> roomByRoomId = cinemaRoomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(com.filmticket.entity.CinemaRoom::getId, room -> room));

        List<UUID> theaterIds = roomByRoomId.values().stream().map(com.filmticket.entity.CinemaRoom::getTheaterId).distinct().toList();
        Map<UUID, com.filmticket.entity.Theater> theaterById = theaterRepository.findAllById(theaterIds).stream()
                .collect(Collectors.toMap(com.filmticket.entity.Theater::getId, t -> t));

        return showtimes.stream()
                .map(s -> {
                    com.filmticket.entity.CinemaRoom room = roomByRoomId.get(s.getCinemaRoomId());
                    String cinemaRoomName = room != null ? room.getName() : null;
                    UUID theaterId = room != null ? room.getTheaterId() : null;
                    String theaterName = theaterId != null && theaterById.containsKey(theaterId)
                            ? theaterById.get(theaterId).getName() : null;
                    return ShowtimeResponse.fromShowtimeContext(
                            s,
                            movieTitleByMovieId.get(s.getMovieId()),
                            cinemaRoomName,
                            theaterId,
                            theaterName
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getAllShowtimes() {
        return enrich(showtimeRepository.findAll());
    }

    private static final int CLEANUP_MINUTES = 15;

    @Transactional
    public ShowtimeResponse createShowtime(@Valid UpsertShowtimeRequest request) {
        LocalDateTime now = LocalDateTime.now();

        if (!request.getStartTime().isAfter(now)) {
            throw new BadRequestException("Start time must be in the future");
        }

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        if (!movie.isActive() || movie.getStatus() != Movie.Status.NOW_SHOWING) {
            throw new BadRequestException("Movie is not currently active");
        }

        CinemaRoom room = cinemaRoomRepository.findById(request.getCinemaRoomId())
                .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BadRequestException("Cinema room is not active");
        }
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new BadRequestException("Cannot create showtime in a room that is under maintenance");
        }

        LocalDateTime endTime = request.getStartTime()
                .plusMinutes(movie.getDurationMinutes())
                .plusMinutes(CLEANUP_MINUTES);

        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), endTime, null);

        Showtime showtime = Showtime.builder()
                .movieId(request.getMovieId())
                .cinemaRoomId(request.getCinemaRoomId())
                .startTime(request.getStartTime())
                .endTime(endTime)
                .status(request.getStatus())
                .build();

        Showtime savedShowtime = showtimeRepository.save(showtime);
        ensureSeatAvailabilities(savedShowtime);
        return enrich(List.of(savedShowtime)).get(0);
    }

    @Transactional
    public ShowtimeResponse updateShowtime(UUID showtimeId, @Valid UpsertShowtimeRequest request) {
        LocalDateTime now = LocalDateTime.now();

        if (!request.getStartTime().isAfter(now)) {
            throw new BadRequestException("Start time must be in the future");
        }

        Showtime showtime = getShowtimeEntityOrThrow(showtimeId);

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        if (!movie.isActive() || movie.getStatus() != Movie.Status.NOW_SHOWING) {
            throw new BadRequestException("Movie is not currently active");
        }

        CinemaRoom room = cinemaRoomRepository.findById(request.getCinemaRoomId())
                .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BadRequestException("Cinema room is not active");
        }
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new BadRequestException("Cannot create showtime in a room that is under maintenance");
        }

        LocalDateTime endTime = request.getStartTime()
                .plusMinutes(movie.getDurationMinutes())
                .plusMinutes(CLEANUP_MINUTES);

        validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), endTime, showtimeId);

        showtime.setMovieId(request.getMovieId());
        showtime.setCinemaRoomId(request.getCinemaRoomId());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(endTime);
        showtime.setStatus(request.getStatus());

        Showtime savedShowtime = showtimeRepository.save(showtime);
        ensureSeatAvailabilities(savedShowtime);
        return enrich(List.of(savedShowtime)).get(0);
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
        return enrich(showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByDate(java.time.LocalDate date) {
        return enrich(showtimeRepository.findByDate(date));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndDate(UUID movieId, java.time.LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByMovieIdAndDate(movieId, date));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByTheater(UUID theaterId) {
        return enrich(showtimeRepository.findByTheaterId(theaterId));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndTheater(UUID movieId, UUID theaterId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByTheaterIdAndMovieId(theaterId, movieId));
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

    private void validateNoOverlap(UUID cinemaRoomId, LocalDateTime startTime,
            LocalDateTime endTime, UUID excludeId) {
        List<Showtime> overlapping;
        if (excludeId == null) {
            overlapping = showtimeRepository.findOverlappingShowtimes(cinemaRoomId, startTime, endTime);
        } else {
            overlapping = showtimeRepository.findOverlappingShowtimesExcluding(cinemaRoomId, startTime, endTime, excludeId);
        }

        if (!overlapping.isEmpty()) {
            throw new BadRequestException("Showtime overlaps with an existing showtime in this room");
        }
    }
}
