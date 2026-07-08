package com.filmticket.service;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.Ticket;
import com.filmticket.entity.User;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TicketRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StaffReportService {
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final UserRepository userRepository;

    public Map<String, Object> revenue(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        Map<LocalDate, BigDecimal> byDate = emptyMoneyDays(range);
        paymentRepository.findAll().stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> paymentDate(payment) != null && range.contains(paymentDate(payment)))
                .forEach(payment -> byDate.merge(paymentDate(payment), payment.getAmount(), BigDecimal::add));

        List<Map<String, Object>> daily = byDate.entrySet().stream().map(entry -> row(
                "date", entry.getKey(), "cinema", entry.getValue(), "online", BigDecimal.ZERO,
                "total", entry.getValue())).toList();
        BigDecimal total = byDate.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return row("from", range.from, "to", range.to, "totalRevenue", total,
                "cinemaRevenue", total, "onlineRevenue", BigDecimal.ZERO, "daily", daily);
    }

    public Map<String, Object> ticketSales(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        Map<LocalDate, Long> byDate = emptyCountDays(range);
        Map<UUID, Booking> bookings = bookingRepository.findAll().stream()
                .collect(Collectors.toMap(Booking::getId, Function.identity()));
        ticketRepository.findAll().stream()
                .filter(ticket -> range.contains(ticket.getCreatedAt().toLocalDate()))
                .filter(ticket -> {
                    Booking booking = bookings.get(ticket.getBookingId());
                    return booking != null && booking.getStatus() == BookingStatus.CONFIRMED;
                })
                .forEach(ticket -> byDate.merge(ticket.getCreatedAt().toLocalDate(), 1L, (a, b) -> a + b));
        List<Map<String, Object>> daily = byDate.entrySet().stream()
                .map(entry -> row("date", entry.getKey(), "tickets", entry.getValue())).toList();
        long totalTickets = byDate.values().stream().mapToLong(Long::longValue).sum();
        return row("from", range.from, "to", range.to, "totalTickets", totalTickets,
                "ticketsSold", totalTickets, "totalAmount", revenue(range.from, range.to).get("totalRevenue"),
                "daily", daily);
    }

    public Map<String, Object> onlineMovieSales(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        List<Map<String, Object>> daily = range.days().stream()
                .map(date -> row("date", date, "sales", 0, "views", 0, "revenue", BigDecimal.ZERO)).toList();
        return row("from", range.from, "to", range.to, "totalSales", 0, "totalViews", 0,
                "onlineSales", 0, "viewCount", 0, "totalRevenue", BigDecimal.ZERO, "daily", daily,
                "available", false);
    }

    public Map<String, Object> topMovies(int limit) {
        ReportContext context = context();
        DateRange range = range(null, null);
        Map<UUID, MutableAggregate> aggregate = new HashMap<>();
        context.tickets.stream().filter(ticket -> range.contains(ticket.getCreatedAt().toLocalDate()))
                .forEach(ticket -> {
                    Booking booking = context.bookings.get(ticket.getBookingId());
                    Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
                    if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED || showtime == null) return;
                    aggregate.computeIfAbsent(showtime.getMovieId(), ignored -> new MutableAggregate()).count++;
                });
        context.payments.stream().filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> paymentDate(payment) != null && range.contains(paymentDate(payment)))
                .forEach(payment -> {
                    Booking booking = context.bookings.get(payment.getBookingId());
                    Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
                    if (showtime != null) aggregate.computeIfAbsent(showtime.getMovieId(), ignored -> new MutableAggregate()).revenue =
                            aggregate.get(showtime.getMovieId()).revenue.add(payment.getAmount());
                });
        List<Map<String, Object>> items = aggregate.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue().count, a.getValue().count))
                .limit(Math.max(1, limit))
                .map(entry -> row("movieId", entry.getKey(), "movieTitle",
                        context.movies.getOrDefault(entry.getKey(), Movie.builder().title("Không rõ").build()).getTitle(),
                        "tickets", entry.getValue().count, "revenue", entry.getValue().revenue))
                .toList();
        return row("limit", limit, "items", items, "topMovies", items);
    }

    public Map<String, Object> topShowtimes(int limit) {
        ReportContext context = context();
        Map<UUID, Long> soldByShowtime = new HashMap<>();
        context.tickets.forEach(ticket -> {
            Booking booking = context.bookings.get(ticket.getBookingId());
            if (booking != null && booking.getStatus() == BookingStatus.CONFIRMED) {
                soldByShowtime.merge(booking.getShowtimeId(), 1L, (a, b) -> a + b);
            }
        });
        List<Map<String, Object>> items = soldByShowtime.entrySet().stream()
                .filter(entry -> context.showtimes.containsKey(entry.getKey()))
                .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                .limit(Math.max(1, limit))
                .map(entry -> {
                    Showtime showtime = context.showtimes.get(entry.getKey());
                    Movie movie = context.movies.get(showtime.getMovieId());
                    CinemaRoom room = context.rooms.get(showtime.getCinemaRoomId());
                    return row("showtimeId", showtime.getId(), "movieTitle", movie == null ? "Không rõ" : movie.getTitle(),
                            "room", room == null ? "Không rõ" : room.getName(), "startTime", showtime.getStartTime(),
                            "sold", entry.getValue(), "capacity", room == null || room.getCapacity() == null ? 0 : room.getCapacity());
                }).toList();
        return row("limit", limit, "items", items, "topShowtimes", items);
    }

    public Map<String, Object> dashboard() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        BigDecimal todayRevenue = paidRevenue(today);
        BigDecimal yesterdayRevenue = paidRevenue(yesterday);
        long todayTickets = confirmedTickets(today);
        long yesterdayTickets = confirmedTickets(yesterday);
        LocalDateTime now = LocalDateTime.now();
        long activeScreenings = showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .filter(showtime -> !showtime.getStartTime().isAfter(now) && showtime.getEndTime().isAfter(now))
                .count();

        ReportContext context = context();
        List<Map<String, Object>> recentCheckIns = context.tickets.stream().filter(Ticket::isCheckedIn)
                .sorted(Comparator.comparing(this::checkInTime).reversed()).limit(5)
                .map(ticket -> checkInRow(ticket, context)).toList();
        long checkedIn = context.tickets.stream().filter(Ticket::isCheckedIn).count();
        return row("todayRevenue", todayRevenue, "revenueTrend", trend(todayRevenue, yesterdayRevenue),
                "revenueTrendValue", trendLabel(todayRevenue, yesterdayRevenue), "totalTicketsSold", todayTickets,
                "ticketsTrend", trend(todayTickets, yesterdayTickets), "ticketsTrendValue", trendLabel(todayTickets, yesterdayTickets),
                "checkedInTickets", checkedIn, "activeScreenings", activeScreenings, "recentCheckIns", recentCheckIns);
    }

    public Map<String, Object> customers() {
        List<User> members = userRepository.findAll().stream().filter(user -> user.getRole() == User.Role.MEMBER).toList();
        Map<UUID, List<Booking>> confirmedByUser = bookingRepository.findAll().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .collect(Collectors.groupingBy(Booking::getUserId));
        long loyal = members.stream().filter(user -> confirmedByUser.getOrDefault(user.getId(), List.of()).size() >= 5).count();
        long active = members.stream().filter(user -> {
            int count = confirmedByUser.getOrDefault(user.getId(), List.of()).size();
            return count > 0 && count < 5;
        }).count();
        long noPurchase = members.size() - loyal - active;
        Set<UUID> memberIds = members.stream().map(User::getId).collect(Collectors.toSet());
        BigDecimal totalSpend = confirmedByUser.entrySet().stream().filter(entry -> memberIds.contains(entry.getKey()))
                .flatMap(entry -> entry.getValue().stream())
                .map(Booking::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageSpend = members.isEmpty() ? BigDecimal.ZERO :
                totalSpend.divide(BigDecimal.valueOf(members.size()), 0, java.math.RoundingMode.HALF_UP);
        return row("totalMembers", members.size(), "loyalCustomers", loyal, "activeCustomers", active,
                "customersWithoutPurchase", noPurchase, "averageSpend", averageSpend);
    }

    private Map<String, Object> checkInRow(Ticket ticket, ReportContext context) {
        Booking booking = context.bookings.get(ticket.getBookingId());
        Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
        Movie movie = showtime == null ? null : context.movies.get(showtime.getMovieId());
        User customer = booking == null ? null : context.users.get(booking.getUserId());
        return row("id", ticket.getTicketCode(), "customer", customer == null ? "Không rõ" : customer.getFullName(),
                "movie", movie == null ? "Không rõ" : movie.getTitle(), "time",
                ticket.getCheckedInAt() == null ? ticket.getCreatedAt() : ticket.getCheckedInAt(), "status", "Checked In");
    }

    private LocalDateTime checkInTime(Ticket ticket) {
        return ticket.getCheckedInAt() == null ? ticket.getCreatedAt() : ticket.getCheckedInAt();
    }

    private BigDecimal paidRevenue(LocalDate date) {
        return paymentRepository.findAll().stream().filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> date.equals(paymentDate(payment)))
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long confirmedTickets(LocalDate date) {
        Set<UUID> confirmed = bookingRepository.findAll().stream().filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .map(Booking::getId).collect(Collectors.toSet());
        return ticketRepository.findAll().stream().filter(ticket -> confirmed.contains(ticket.getBookingId()))
                .filter(ticket -> ticket.getCreatedAt().toLocalDate().equals(date)).count();
    }

    private LocalDate paymentDate(Payment payment) {
        LocalDateTime timestamp = payment.getPaidAt() != null ? payment.getPaidAt() : payment.getCreatedAt();
        return timestamp == null ? null : timestamp.toLocalDate();
    }

    private ReportContext context() {
        return new ReportContext(
                bookingRepository.findAll().stream().collect(Collectors.toMap(Booking::getId, Function.identity())),
                showtimeRepository.findAll().stream().collect(Collectors.toMap(Showtime::getId, Function.identity())),
                movieRepository.findAll().stream().collect(Collectors.toMap(Movie::getId, Function.identity())),
                cinemaRoomRepository.findAll().stream().collect(Collectors.toMap(CinemaRoom::getId, Function.identity())),
                userRepository.findAll().stream().collect(Collectors.toMap(User::getId, Function.identity())),
                ticketRepository.findAll(), paymentRepository.findAll());
    }

    private DateRange range(LocalDate from, LocalDate to) {
        LocalDate resolvedTo = to == null ? LocalDate.now() : to;
        LocalDate resolvedFrom = from == null ? resolvedTo.minusDays(6) : from;
        if (resolvedFrom.isAfter(resolvedTo)) throw new IllegalArgumentException("from must not be after to");
        return new DateRange(resolvedFrom, resolvedTo);
    }

    private Map<LocalDate, BigDecimal> emptyMoneyDays(DateRange range) {
        Map<LocalDate, BigDecimal> result = new LinkedHashMap<>();
        range.days().forEach(date -> result.put(date, BigDecimal.ZERO));
        return result;
    }

    private Map<LocalDate, Long> emptyCountDays(DateRange range) {
        Map<LocalDate, Long> result = new LinkedHashMap<>();
        range.days().forEach(date -> result.put(date, 0L));
        return result;
    }

    private String trend(BigDecimal current, BigDecimal previous) { return current.compareTo(previous) >= 0 ? "up" : "down"; }
    private String trend(long current, long previous) { return current >= previous ? "up" : "down"; }
    private String trendLabel(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) return current.signum() == 0 ? "0%" : "+100%";
        return String.format("%+.0f%%", current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous, 2, java.math.RoundingMode.HALF_UP));
    }
    private String trendLabel(long current, long previous) {
        if (previous == 0) return current == 0 ? "0%" : "+100%";
        return String.format("%+.0f%%", (current - previous) * 100.0 / previous);
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) result.put((String) values[i], values[i + 1]);
        return result;
    }

    private static class MutableAggregate { long count; BigDecimal revenue = BigDecimal.ZERO; }
    private record DateRange(LocalDate from, LocalDate to) {
        boolean contains(LocalDate date) { return !date.isBefore(from) && !date.isAfter(to); }
        List<LocalDate> days() {
            List<LocalDate> dates = new ArrayList<>();
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) dates.add(date);
            return dates;
        }
    }
    private record ReportContext(Map<UUID, Booking> bookings, Map<UUID, Showtime> showtimes,
            Map<UUID, Movie> movies, Map<UUID, CinemaRoom> rooms, Map<UUID, User> users,
            List<Ticket> tickets, List<Payment> payments) {}
}
