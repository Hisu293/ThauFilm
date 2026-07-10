package com.filmticket.service;

import com.filmticket.dto.DemandPredictionResponse.ShowtimeSuggestion;
import com.filmticket.dto.ShowtimeResponse;
import com.filmticket.dto.UpsertShowtimeRequest;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminIntelligenceService {
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final MovieRepository movieRepository;
    private final SeatTypePriceConfigRepository priceConfigRepository;
    private final ShowtimePriceOverrideRepository overrideRepository;
    private final SeatAvailabilityRepository availabilityRepository;
    private final DemandPredictionService demandPredictionService;
    private final ShowtimeService showtimeService;

    @Transactional(readOnly = true)
    public Map<String, Object> seatHeatmap(UUID roomId) {
        CinemaRoom room = cinemaRoomRepository.findById(roomId)
                .orElseThrow(() -> new BadRequestException("Cinema room not found"));
        List<Seat> seats = seatRepository.findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(roomId);
        Set<UUID> showtimeIds = showtimeRepository.findAll().stream()
                .filter(showtime -> roomId.equals(showtime.getCinemaRoomId())).map(Showtime::getId).collect(Collectors.toSet());
        Set<UUID> confirmedBookings = bookingRepository.findAll().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED && showtimeIds.contains(booking.getShowtimeId()))
                .map(Booking::getId).collect(Collectors.toSet());
        Map<UUID, Long> countBySeat = bookingSeatRepository.findAll().stream()
                .filter(item -> confirmedBookings.contains(item.getBookingId()))
                .collect(Collectors.groupingBy(BookingSeat::getSeatId, Collectors.counting()));
        long maxCount = Math.max(1, countBySeat.values().stream().mapToLong(Long::longValue).max().orElse(0));
        Map<String, Integer> maxNumberByRow = seats.stream().collect(Collectors.groupingBy(Seat::getRowName,
                Collectors.collectingAndThen(Collectors.maxBy(Comparator.comparingInt(Seat::getSeatNumber)), value -> value.map(Seat::getSeatNumber).orElse(1))));

        List<Map<String, Object>> cells = seats.stream().map(seat -> {
            long selected = countBySeat.getOrDefault(seat.getId(), 0L);
            int heat = (int) Math.round(selected * 100.0 / maxCount);
            return map("seatId", seat.getId(), "label", seat.getRowName() + seat.getSeatNumber(), "row", seat.getRowName(),
                    "number", seat.getSeatNumber(), "type", seat.getType(), "selectedCount", selected, "heat", heat,
                    "zone", isCentral(seat, maxNumberByRow.get(seat.getRowName())) ? "CENTER" : "EDGE");
        }).toList();
        double centerAverage = cells.stream().filter(cell -> "CENTER".equals(cell.get("zone"))).mapToLong(cell -> (Long) cell.get("selectedCount")).average().orElse(0);
        double edgeAverage = cells.stream().filter(cell -> "EDGE".equals(cell.get("zone"))).mapToLong(cell -> (Long) cell.get("selectedCount")).average().orElse(0);
        int faster = edgeAverage == 0 ? (centerAverage > 0 ? 100 : 0) : (int) Math.round((centerAverage / edgeAverage - 1) * 100);
        Map<String, Double> rowAverage = cells.stream().collect(Collectors.groupingBy(cell -> (String) cell.get("row"),
                Collectors.averagingLong(cell -> (Long) cell.get("selectedCount"))));
        List<String> hotRows = rowAverage.entrySet().stream().sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(2).map(Map.Entry::getKey).toList();
        return map("roomId", roomId, "roomName", room.getName(), "sampleBookings", confirmedBookings.size(), "seats", cells,
                "centerAdvantagePercent", faster, "hotRows", hotRows,
                "insight", faster > 0 ? "Ghế trung tâm được chọn nhiều hơn " + faster + "% so với ghế góc" : "Chưa đủ chênh lệch để xác định vùng ghế nóng",
                "pricingSuggestion", hotRows.isEmpty() ? "Chưa đủ dữ liệu" : "Nên tăng giá hàng " + String.join("-", hotRows) + " thêm 10%");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pricingSuggestions() {
        Map<UUID, CinemaRoom> rooms = cinemaRoomRepository.findAll().stream().collect(Collectors.toMap(CinemaRoom::getId, Function.identity()));
        Map<UUID, Long> sold = confirmedSeatsByShowtime();
        List<SeatTypePriceConfig> configs = priceConfigRepository.findByActiveTrue();
        LocalDateTime now = LocalDateTime.now();
        return showtimeRepository.findAll().stream().filter(showtime -> showtime.getStartTime().isAfter(now))
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED).sorted(Comparator.comparing(Showtime::getStartTime))
                .map(showtime -> {
                    CinemaRoom room = rooms.get(showtime.getCinemaRoomId());
                    int capacity = room == null || room.getCapacity() == null ? 1 : Math.max(1, room.getCapacity());
                    long soldSeats = sold.getOrDefault(showtime.getId(), 0L);
                    int occupancy = (int) Math.round(soldSeats * 100.0 / capacity);
                    int predicted = room == null ? occupancy : demandPredictionService.predictOccupancy(showtime.getMovieId(), showtime.getStartTime(), room.getType());
                    int demand = Math.max(occupancy, predicted);
                    double multiplier = demand >= 90 ? 1.25 : demand >= 70 ? 1.15 : demand <= 20 ? .75 : demand <= 40 ? .9 : 1;
                    Map<String, BigDecimal> prices = new LinkedHashMap<>();
                    configs.forEach(config -> prices.put(config.getSeatType(), config.getPrice().multiply(BigDecimal.valueOf(multiplier))
                            .divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1000))));
                    return map("showtimeId", showtime.getId(), "movieId", showtime.getMovieId(), "roomName", room == null ? "—" : room.getName(),
                            "startTime", showtime.getStartTime(), "sold", soldSeats, "capacity", capacity, "occupancyPercent", occupancy,
                            "predictedOccupancyPercent", predicted, "multiplierPercent", (int) Math.round((multiplier - 1) * 100), "suggestedPrices", prices);
                }).toList();
    }

    @Transactional
    public Map<String, Object> applyPricing(UUID showtimeId, Map<String, BigDecimal> prices) {
        if (!showtimeRepository.existsById(showtimeId)) throw new BadRequestException("Showtime not found");
        prices.forEach((seatType, price) -> {
            ShowtimePriceOverride override = overrideRepository.findByShowtimeIdAndSeatType(showtimeId, seatType)
                    .orElseGet(() -> ShowtimePriceOverride.builder().showtimeId(showtimeId).seatType(seatType).build());
            override.setPrice(price); overrideRepository.save(override);
        });
        Map<UUID, Seat> seats = seatRepository.findAll().stream().collect(Collectors.toMap(Seat::getId, Function.identity()));
        List<SeatAvailability> availabilities = availabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        availabilities.forEach(availability -> {
            Seat seat = seats.get(availability.getSeatId());
            if (seat != null && prices.containsKey(seat.getType().toStorageValue())) availability.setPrice(prices.get(seat.getType().toStorageValue()));
        });
        availabilityRepository.saveAll(availabilities);
        return map("showtimeId", showtimeId, "appliedPrices", prices, "updatedSeats", availabilities.size());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> weeklyPlan(LocalDate startDate) {
        LocalDate requestedStart = startDate == null ? LocalDate.now().plusWeeks(1) : startDate;
        LocalDate start = requestedStart.with(
                java.time.temporal.TemporalAdjusters.nextOrSame(java.time.DayOfWeek.MONDAY));
        List<Movie> movies = movieRepository.findAll().stream().filter(Movie::isActive)
                .filter(movie -> movie.getStatus() == Movie.Status.NOW_SHOWING).toList();
        Map<UUID, List<ShowtimeSuggestion>> byMovie = new LinkedHashMap<>();
        movies.forEach(movie -> byMovie.put(movie.getId(), demandPredictionService.suggest(movie.getId(), start, 8)));
        List<ShowtimeSuggestion> selected = new ArrayList<>();
        for (int round = 0; round < 6; round++) {
            for (Movie movie : movies) {
                List<ShowtimeSuggestion> choices = byMovie.get(movie.getId());
                if (round >= choices.size()) continue;
                ShowtimeSuggestion choice = choices.get(round);
                boolean conflict = selected.stream().anyMatch(other -> choice.getCinemaRoomId().equals(other.getCinemaRoomId())
                        && other.getStartTime().isBefore(choice.getEndTime()) && other.getEndTime().isAfter(choice.getStartTime()));
                if (!conflict) selected.add(choice);
            }
        }
        Map<UUID, String> titles = movies.stream().collect(Collectors.toMap(Movie::getId, Movie::getTitle));
        List<Map<String, Object>> plan = selected.stream().sorted(Comparator.comparing(ShowtimeSuggestion::getStartTime))
                .map(item -> map("movieId", item.getMovieId(), "movieTitle", titles.get(item.getMovieId()), "cinemaRoomId", item.getCinemaRoomId(),
                        "online", false, "channel", "THEATER",
                        "roomName", item.getRoomName(), "startTime", item.getStartTime(), "endTime", item.getEndTime(),
                        "predictedOccupancyPercent", item.getPredictedOccupancyPercent(), "reason", item.getReason())).collect(Collectors.toCollection(ArrayList::new));
        plan.addAll(onlineWeeklyPlan(movies, start, titles));
        plan.sort(Comparator.comparing(item -> (LocalDateTime) item.get("startTime")));
        return plan;
    }

    @Transactional
    public List<ShowtimeResponse> applyWeeklyPlan(List<WeeklyShowtimeRequest> plan) {
        List<ShowtimeResponse> created = new ArrayList<>();
        for (WeeklyShowtimeRequest item : plan) {
            if (item == null) {
                continue;
            }
            boolean online = Boolean.TRUE.equals(item.online());
            if (item.movieId() == null || (!online && item.cinemaRoomId() == null) || item.startTime() == null) {
                continue;
            }

            LocalDateTime endTime = item.endTime();
            if (endTime == null || !endTime.isAfter(item.startTime())) {
                Movie movie = movieRepository.findById(item.movieId()).orElse(null);
                if (movie == null || movie.getDurationMinutes() == null) {
                    continue;
                }
                endTime = item.startTime().plusMinutes(movie.getDurationMinutes()).plusMinutes(15);
            }

            if (!online) {
                boolean overlapsExisting = !showtimeRepository
                        .findOverlappingShowtimes(item.cinemaRoomId(), item.startTime(), endTime)
                        .isEmpty();
                if (overlapsExisting) {
                    continue;
                }
            }

            try {
                created.add(showtimeService.createShowtime(UpsertShowtimeRequest.builder()
                        .movieId(item.movieId())
                        .cinemaRoomId(item.cinemaRoomId())
                        .startTime(item.startTime())
                        .endTime(endTime)
                        .status(ShowtimeStatus.SCHEDULED)
                        .online(online)
                        .build()));
            } catch (BadRequestException ex) {
                if (ex.getMessage() == null || !ex.getMessage().toLowerCase(Locale.ROOT).contains("overlap")) {
                    throw ex;
                }
            }
        }
        return created;
    }

    private Map<UUID, Long> confirmedSeatsByShowtime() {
        Map<UUID, UUID> bookingShowtime = bookingRepository.findAll().stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .collect(Collectors.toMap(Booking::getId, Booking::getShowtimeId));
        Map<UUID, Long> result = new HashMap<>();
        bookingSeatRepository.findAll().forEach(item -> { UUID showtime = bookingShowtime.get(item.getBookingId()); if (showtime != null) result.put(showtime, result.getOrDefault(showtime, 0L) + 1); });
        return result;
    }
    private List<Map<String, Object>> onlineWeeklyPlan(List<Movie> movies, LocalDate start, Map<UUID, String> titles) {
        List<Movie> streamable = movies.stream()
                .filter(movie -> movie.getStreamKey() != null && !movie.getStreamKey().trim().isBlank())
                .toList();
        if (streamable.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> items = new ArrayList<>();
        List<java.time.LocalTime> onlineTimes = List.of(java.time.LocalTime.of(20, 0), java.time.LocalTime.of(22, 30));
        int maxDays = Math.min(7, streamable.size() * 2);
        for (int day = 0; day < maxDays; day++) {
            Movie movie = streamable.get(day % streamable.size());
            java.time.LocalTime time = onlineTimes.get(day % onlineTimes.size());
            LocalDateTime startTime = LocalDateTime.of(start.plusDays(day), time);
            LocalDateTime endTime = startTime.plusMinutes(movie.getDurationMinutes() == null ? 120 : movie.getDurationMinutes()).plusMinutes(15);
            items.add(map("movieId", movie.getId(), "movieTitle", titles.get(movie.getId()), "cinemaRoomId", null,
                    "online", true, "channel", "ONLINE", "roomName", "Xem online", "startTime", startTime, "endTime", endTime,
                    "predictedOccupancyPercent", 70, "reason", "Suất online tự động cho phim có stream, không chiếm phòng chiếu"));
        }
        return items;
    }
    private boolean isCentral(Seat seat, int max) { double center = (max + 1) / 2.0; return Math.abs(seat.getSeatNumber() - center) <= Math.max(1, max * .25); }
    private Map<String, Object> map(Object... values) { Map<String, Object> result = new LinkedHashMap<>(); for (int i=0;i<values.length;i+=2) result.put((String) values[i], values[i+1]); return result; }
    public record WeeklyShowtimeRequest(UUID movieId, UUID cinemaRoomId, LocalDateTime startTime, LocalDateTime endTime, Boolean online) {}
}
