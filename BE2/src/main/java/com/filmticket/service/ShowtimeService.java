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
import com.filmticket.model.ShowtimeStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
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

    private static final BigDecimal MYSTERY_PRICE = BigDecimal.valueOf(79000);

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final TheaterRepository theaterRepository;
    private final PricingService pricingService;

    private List<ShowtimeResponse> enrich(List<Showtime> showtimes) {
        return enrich(showtimes, true);
    }

    private List<ShowtimeResponse> enrich(List<Showtime> showtimes, boolean revealMystery) {
        if (showtimes.isEmpty()) return List.of();

        List<UUID> movieIds = showtimes.stream().map(Showtime::getMovieId).distinct().toList();
        List<UUID> roomIds = showtimes.stream()
                .map(Showtime::getCinemaRoomId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

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
                    String cinemaRoomName = s.isOnline() ? "Xem online" : (room != null ? room.getName() : null);
                    UUID theaterId = room != null ? room.getTheaterId() : null;
                    String theaterName = s.isOnline() ? "Online" : (theaterId != null && theaterById.containsKey(theaterId)
                            ? theaterById.get(theaterId).getName() : null);
                    return ShowtimeResponse.fromShowtimeContext(
                            s,
                            movieTitleByMovieId.get(s.getMovieId()),
                            cinemaRoomName,
                            theaterId,
                            theaterName,
                            revealMystery
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getAllShowtimes() {
        return enrich(showtimeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicAllShowtimes() {
        return enrich(showtimeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")), false);
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

        boolean online = Boolean.TRUE.equals(request.getOnline());
        if (online && (movie.getStreamKey() == null || movie.getStreamKey().trim().isBlank())) {
            throw new BadRequestException("Online stream is not configured for this movie");
        }
        if (!online) {
            if (request.getCinemaRoomId() == null) {
                throw new BadRequestException("Cinema room is required for theater showtimes");
            }
            CinemaRoom room = cinemaRoomRepository.findById(request.getCinemaRoomId())
                    .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw new BadRequestException("Cinema room is not active");
            }
            if (room.getStatus() == RoomStatus.MAINTENANCE) {
                throw new BadRequestException("Cannot create showtime in a room that is under maintenance");
            }
        }

        LocalDateTime endTime = request.getStartTime()
                .plusMinutes(movie.getDurationMinutes())
                .plusMinutes(CLEANUP_MINUTES);

        if (!online) {
            validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), endTime, null);
        }

        Showtime showtime = Showtime.builder()
                .movieId(request.getMovieId())
                .cinemaRoomId(online ? null : request.getCinemaRoomId())
                .startTime(request.getStartTime())
                .endTime(endTime)
                .status(request.getStatus())
                .online(online)
                .mystery(Boolean.TRUE.equals(request.getMystery()))
                .mysteryUnlockAt(Boolean.TRUE.equals(request.getMystery())
                        ? (request.getMysteryUnlockAt() != null ? request.getMysteryUnlockAt() : request.getStartTime())
                        : null)
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

        boolean online = Boolean.TRUE.equals(request.getOnline());
        if (online && (movie.getStreamKey() == null || movie.getStreamKey().trim().isBlank())) {
            throw new BadRequestException("Online stream is not configured for this movie");
        }
        if (!online) {
            if (request.getCinemaRoomId() == null) {
                throw new BadRequestException("Cinema room is required for theater showtimes");
            }
            CinemaRoom room = cinemaRoomRepository.findById(request.getCinemaRoomId())
                    .orElseThrow(() -> new BadRequestException("CinemaRoom not found"));
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw new BadRequestException("Cinema room is not active");
            }
            if (room.getStatus() == RoomStatus.MAINTENANCE) {
                throw new BadRequestException("Cannot create showtime in a room that is under maintenance");
            }
        }

        LocalDateTime endTime = request.getStartTime()
                .plusMinutes(movie.getDurationMinutes())
                .plusMinutes(CLEANUP_MINUTES);

        if (!online) {
            validateNoOverlap(request.getCinemaRoomId(), request.getStartTime(), endTime, showtimeId);
        }

        showtime.setMovieId(request.getMovieId());
        showtime.setCinemaRoomId(online ? null : request.getCinemaRoomId());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(endTime);
        showtime.setStatus(request.getStatus());
        showtime.setOnline(online);
        showtime.setMystery(Boolean.TRUE.equals(request.getMystery()));
        showtime.setMysteryUnlockAt(showtime.isMystery()
                ? (request.getMysteryUnlockAt() != null ? request.getMysteryUnlockAt() : request.getStartTime())
                : null);

        Showtime savedShowtime = showtimeRepository.save(showtime);
        ensureSeatAvailabilities(savedShowtime);
        return enrich(List.of(savedShowtime)).get(0);
    }

    @Transactional
    public void deleteShowtime(UUID showtimeId) {
        Showtime showtime = getShowtimeEntityOrThrow(showtimeId);
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);
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
    public List<ShowtimeResponse> getPublicShowtimesByMovie(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByMovieIdOrderByStartTimeAsc(movieId), false);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByDate(java.time.LocalDate date) {
        return enrich(showtimeRepository.findByDate(date));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimesByDate(java.time.LocalDate date) {
        return enrich(showtimeRepository.findByDate(date), false);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndDate(UUID movieId, java.time.LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByMovieIdAndDate(movieId, date));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimesByMovieAndDate(UUID movieId, java.time.LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByMovieIdAndDate(movieId, date), false);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByTheater(UUID theaterId) {
        return enrich(showtimeRepository.findByTheaterId(theaterId));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimesByTheater(UUID theaterId) {
        return enrich(showtimeRepository.findByTheaterId(theaterId), false);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndTheater(UUID movieId, UUID theaterId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByTheaterIdAndMovieId(theaterId, movieId));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimesByMovieAndTheater(UUID movieId, UUID theaterId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        return enrich(showtimeRepository.findByTheaterIdAndMovieId(theaterId, movieId), false);
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getCinemasByMovie(UUID movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new BadRequestException("Movie not found");
        }
        List<UUID> roomIds = showtimeRepository.findDistinctCinemaRoomIdsByMovieId(movieId);
        return roomIds.stream()
                .filter(java.util.Objects::nonNull)
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
        if (showtime.isOnline()) {
            seatAvailabilityRepository.deleteByShowtimeId(showtime.getId());
            return;
        }
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
            applyPricing(showtime, newAvailabilities);
            seatAvailabilityRepository.saveAll(newAvailabilities);
        } else {
            applyPricing(showtime, existing);
            seatAvailabilityRepository.saveAll(existing);
        }
    }

    private void applyPricing(Showtime showtime, List<SeatAvailability> availabilities) {
        if (showtime.isMystery()) {
            availabilities.forEach(availability -> availability.setPrice(MYSTERY_PRICE));
            return;
        }
        pricingService.applyDefaultPricing(availabilities);
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
