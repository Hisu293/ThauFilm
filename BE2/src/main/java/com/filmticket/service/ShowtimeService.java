package com.filmticket.service;

import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.ShowtimeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieService movieService;
    private final CinemaRoomService cinemaRoomService;

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

        return ShowtimeResponse.fromShowtime(showtimeRepository.save(showtime));
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

        return ShowtimeResponse.fromShowtime(showtimeRepository.save(showtime));
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
