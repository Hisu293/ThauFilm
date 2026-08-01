package com.filmticket.service;

import com.filmticket.dto.DemandPredictionResponse;
import com.filmticket.dto.DemandPredictionResponse.ShowtimeSuggestion;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.RoomStatus;
import com.filmticket.model.RoomType;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
public class DemandPredictionService {
    private static final int CLEANUP_MINUTES = 1;
    private static final LocalTime OPENING_TIME = LocalTime.of(9, 0);
    private static final LocalTime LAST_START_TIME = LocalTime.of(22, 30);
    private static final int SLOT_STEP_MINUTES = 30;
    private static final List<LocalTime> CANDIDATE_TIMES = candidateTimes();

    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final MovieRepository movieRepository;
    private final SeatRepository seatRepository;

    @Transactional(readOnly = true)
    public DemandPredictionResponse predictTonight() {
        LocalDate today = LocalDate.now();
        List<Showtime> tonight = showtimeRepository.findByDate(today).stream()
                .filter(s -> !s.getStartTime().toLocalTime().isBefore(LocalTime.of(17, 0)))
                .filter(s -> s.getStatus() != ShowtimeStatus.CANCELLED)
                .toList();
        Model model = buildModel();
        Map<UUID, CinemaRoom> rooms = loadRooms();

        int totalSeats = 0;
        double predictedSeats = 0;
        for (Showtime showtime : tonight) {
            CinemaRoom room = rooms.get(showtime.getCinemaRoomId());
            if (room == null) continue;
            int capacity = capacity(room);
            totalSeats += capacity;
            predictedSeats += capacity * predict(model, showtime.getMovieId(), showtime.getStartTime(), room.getType(), room.getTheaterId());
        }
        int percent = totalSeats == 0 ? 0 : (int) Math.round(predictedSeats * 100 / totalSeats);
        return DemandPredictionResponse.builder()
                .date(today)
                .occupancyPercent(percent)
                .predictedSeats((int) Math.round(predictedSeats))
                .totalSeats(totalSeats)
                .showtimeCount(tonight.size())
                .historicalSampleSize(model.samples.size())
                .confidence(confidence(model.samples.size()))
                .message(tonight.isEmpty() ? "Chưa có suất chiếu tối nay" :
                        "Dự đoán " + percent + "% ghế tối nay sẽ được bán")
                .build();
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSuggestion> suggest(UUID movieId, LocalDate fromDate) {
        return suggest(movieId, fromDate, 3);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSuggestion> suggest(UUID movieId, LocalDate fromDate, int limit) {
        return suggest(movieId, fromDate, limit, cinemaRoomRepository.findByStatus(RoomStatus.ACTIVE));
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSuggestion> suggestForRooms(
            UUID movieId, Collection<UUID> cinemaRoomIds, LocalDate fromDate, int limit) {
        List<CinemaRoom> rooms = cinemaRoomRepository.findAllById(cinemaRoomIds).stream()
                .filter(room -> room.getStatus() == RoomStatus.ACTIVE)
                .toList();
        if (rooms.isEmpty()) {
            throw new BadRequestException("No active cinema room is available");
        }
        return suggest(movieId, fromDate, limit, rooms);
    }

    private List<ShowtimeSuggestion> suggest(UUID movieId, LocalDate fromDate, int limit, List<CinemaRoom> rooms) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        if (!movie.isActive() || movie.getStatus() != Movie.Status.NOW_SHOWING) {
            throw new BadRequestException("Movie is not currently active");
        }
        int durationMinutes = movie.getDurationMinutes() == null ? 120 : movie.getDurationMinutes();
        LocalDate startDate = fromDate == null ? LocalDate.now() : fromDate;
        if (startDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Suggestion date cannot be in the past");
        }

        Model model = buildModel();
        Map<UUID, CinemaRoom> allRooms = loadRooms();
        List<Showtime> existingShowtimes = showtimeRepository.findAll();
        List<ShowtimeSuggestion> candidates = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int day = 0; day < 7; day++) {
            LocalDate date = startDate.plusDays(day);
            for (LocalTime time : CANDIDATE_TIMES) {
                LocalDateTime startsAt = LocalDateTime.of(date, time);
                LocalDateTime endsAt = startsAt.plusMinutes(durationMinutes + CLEANUP_MINUTES);
                if (!startsAt.isAfter(now.plusMinutes(30))) continue;
                for (CinemaRoom room : rooms) {
                    boolean duplicateMovieAtTheaterTime = existingShowtimes.stream()
                            .filter(existing -> existing.getStatus() != ShowtimeStatus.CANCELLED)
                            .filter(existing -> movieId.equals(existing.getMovieId()))
                            .filter(existing -> startsAt.equals(existing.getStartTime()))
                            .map(existing -> allRooms.get(existing.getCinemaRoomId()))
                            .filter(java.util.Objects::nonNull)
                            .anyMatch(existingRoom -> Objects.equals(
                                    room.getTheaterId(), existingRoom.getTheaterId()));
                    if (duplicateMovieAtTheaterTime) continue;
                    boolean occupied = existingShowtimes.stream()
                            .filter(existing -> room.getId().equals(existing.getCinemaRoomId()))
                            .filter(existing -> existing.getStatus() != ShowtimeStatus.CANCELLED)
                            .filter(existing -> existing.getStartTime() != null && existing.getEndTime() != null)
                            .anyMatch(existing -> existing.getStartTime().isBefore(endsAt)
                                    && existing.getEndTime().isAfter(startsAt));
                    if (occupied) continue;
                    int percent = (int) Math.round(predict(model, movieId, startsAt, room.getType(), room.getTheaterId()) * 100);
                    candidates.add(ShowtimeSuggestion.builder()
                            .movieId(movieId)
                            .cinemaRoomId(room.getId())
                            .roomName(room.getName())
                            .roomType(room.getType())
                            .startTime(startsAt)
                            .endTime(endsAt)
                            .predictedOccupancyPercent(percent)
                            .reason(reason(startsAt, room.getType(), percent, model.samples.size()))
                            .build());
                }
            }
        }

        return candidates.stream()
                .sorted(Comparator.comparingInt(ShowtimeSuggestion::getPredictedOccupancyPercent).reversed()
                        .thenComparing(ShowtimeSuggestion::getStartTime))
                .limit(Math.max(1, limit))
                .toList();
    }

    @Transactional(readOnly = true)
    public int predictOccupancy(UUID movieId, LocalDateTime startTime, RoomType roomType) {
        return (int) Math.round(predict(buildModel(), movieId, startTime, roomType, null) * 100);
    }

    private Model buildModel() {
        Map<UUID, Long> soldByShowtime = new HashMap<>();
        for (Object[] row : bookingRepository.countSeatsByShowtimeAndStatus(BookingStatus.CONFIRMED)) {
            soldByShowtime.put((UUID) row[0], (Long) row[1]);
        }
        Map<UUID, CinemaRoom> rooms = loadRooms();
        LocalDateTime now = LocalDateTime.now();
        List<Sample> samples = showtimeRepository.findAll().stream()
                .filter(s -> s.getStartTime().isBefore(now))
                .filter(s -> s.getStatus() != ShowtimeStatus.CANCELLED)
                .filter(s -> rooms.containsKey(s.getCinemaRoomId()))
                .map(s -> {
                    CinemaRoom room = rooms.get(s.getCinemaRoomId());
                    int capacity = capacity(room);
                    double occupancy = Math.min(1, soldByShowtime.getOrDefault(s.getId(), 0L) / (double) capacity);
                    return new Sample(s.getMovieId(), s.getStartTime(), room.getType(), room.getTheaterId(), occupancy);
                })
                .toList();
        double global = samples.isEmpty() ? 0.55 : samples.stream().mapToDouble(Sample::occupancy).average().orElse(0.55);
        return new Model(samples, global);
    }

    private double predict(Model model, UUID movieId, LocalDateTime time, RoomType roomType, UUID theaterId) {
        if (model.samples.isEmpty()) return fallback(time, roomType);
        double movie = featureMean(model, s -> s.movieId.equals(movieId), 5);
        double slot = featureMean(model, s -> slot(s.time.getHour()) == slot(time.getHour()), 5);
        double weekday = featureMean(model, s -> s.time.getDayOfWeek() == time.getDayOfWeek(), 4);
        double holiday = featureMean(model, s -> isHoliday(s.time.toLocalDate()) == isHoliday(time.toLocalDate()), 4);
        double room = featureMean(model, s -> s.roomType == roomType, 4);
        double theater = theaterId == null ? model.global
                : featureMean(model, s -> theaterId.equals(s.theaterId), 5);
        return clamp(movie * .30 + slot * .20 + weekday * .15 + holiday * .10
                + room * .10 + theater * .15, .08, .98);
    }

    private double featureMean(Model model, Predicate<Sample> predicate, double smoothing) {
        List<Sample> matching = model.samples.stream().filter(predicate).toList();
        double sum = matching.stream().mapToDouble(Sample::occupancy).sum();
        return (sum + smoothing * model.global) / (matching.size() + smoothing);
    }

    private double fallback(LocalDateTime time, RoomType roomType) {
        double value = 0.48;
        if (time.getDayOfWeek() == DayOfWeek.SATURDAY || time.getDayOfWeek() == DayOfWeek.SUNDAY) value += .14;
        if (time.getHour() >= 18 && time.getHour() <= 21) value += .13;
        if (isHoliday(time.toLocalDate())) value += .10;
        if (roomType == RoomType.IMAX || roomType == RoomType.FOUR_DX) value += .05;
        return clamp(value, .15, .92);
    }

    private Map<UUID, CinemaRoom> loadRooms() {
        Map<UUID, CinemaRoom> result = new HashMap<>();
        cinemaRoomRepository.findAll().forEach(room -> result.put(room.getId(), room));
        return result;
    }

    private int capacity(CinemaRoom room) {
        if (room.getCapacity() != null && room.getCapacity() > 0) return room.getCapacity();
        return Math.max(1, (int) seatRepository.countByCinemaRoomId(room.getId()));
    }

    private int slot(int hour) {
        if (hour < 12) return 0;
        if (hour < 17) return 1;
        if (hour < 22) return 2;
        return 3;
    }

    private static List<LocalTime> candidateTimes() {
        List<LocalTime> times = new ArrayList<>();
        for (LocalTime time = OPENING_TIME; !time.isAfter(LAST_START_TIME); time = time.plusMinutes(SLOT_STEP_MINUTES)) {
            times.add(time);
        }
        return List.copyOf(times);
    }

    private boolean isHoliday(LocalDate date) {
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();
        if ((month == 1 && day == 1) || (month == 4 && day == 30) ||
                (month == 5 && day == 1) || (month == 9 && (day == 1 || day == 2))) return true;
        return switch (date.getYear()) {
            case 2025 -> !date.isBefore(LocalDate.of(2025, 1, 25)) && !date.isAfter(LocalDate.of(2025, 2, 2));
            case 2026 -> !date.isBefore(LocalDate.of(2026, 2, 14)) && !date.isAfter(LocalDate.of(2026, 2, 22));
            case 2027 -> !date.isBefore(LocalDate.of(2027, 2, 5)) && !date.isAfter(LocalDate.of(2027, 2, 13));
            default -> false;
        };
    }

    private String reason(LocalDateTime time, RoomType type, int percent, int samples) {
        String day = (time.getDayOfWeek() == DayOfWeek.SATURDAY || time.getDayOfWeek() == DayOfWeek.SUNDAY)
                ? "cuối tuần" : "ngày thường";
        String evidence = samples == 0 ? "mức nền khi chưa đủ lịch sử" : samples + " suất lịch sử";
        return "Khung " + time.toLocalTime() + ", " + day + ", phòng " + type.getValue() +
                "; dự kiến lấp đầy " + percent + "% dựa trên " + evidence;
    }

    private String confidence(int samples) {
        if (samples >= 50) return "HIGH";
        if (samples >= 15) return "MEDIUM";
        return "LOW";
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private record Sample(UUID movieId, LocalDateTime time, RoomType roomType, UUID theaterId, double occupancy) {}
    private record Model(List<Sample> samples, double global) {}
}
