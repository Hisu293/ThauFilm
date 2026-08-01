package com.filmticket.service;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.OnlineMovieView;
import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.Ticket;
import com.filmticket.entity.User;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.OnlineMovieViewRepository;
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
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
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
    private final OnlineMovieViewRepository onlineMovieViewRepository;

    public Map<String, Object> revenue(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        ReportContext context = context();
        Map<LocalDate, BigDecimal> cinemaByDate = emptyMoneyDays(range);
        Map<LocalDate, BigDecimal> onlineByDate = emptyMoneyDays(range);
        context.payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> paymentDate(payment) != null && range.contains(paymentDate(payment)))
                .forEach(payment -> {
                    Booking booking = context.bookings.get(payment.getBookingId());
                    Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
                    Map<LocalDate, BigDecimal> target = showtime != null && showtime.isOnline() ? onlineByDate : cinemaByDate;
                    target.merge(paymentDate(payment), payment.getAmount(), BigDecimal::add);
                });

        List<Map<String, Object>> daily = range.days().stream().map(date -> {
            BigDecimal cinema = cinemaByDate.getOrDefault(date, BigDecimal.ZERO);
            BigDecimal online = onlineByDate.getOrDefault(date, BigDecimal.ZERO);
            return row("date", date, "cinema", cinema, "online", online, "total", cinema.add(online));
        }).toList();
        BigDecimal cinemaTotal = cinemaByDate.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal onlineTotal = onlineByDate.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = cinemaTotal.add(onlineTotal);
        return row("from", range.from, "to", range.to, "totalRevenue", total,
                "cinemaRevenue", cinemaTotal, "onlineRevenue", onlineTotal, "daily", daily);
    }

    public Map<String, Object> monthlyRevenue(int year, int month) {
        YearMonth selected;
        try {
            selected = YearMonth.of(year, month);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid revenue month");
        }
        YearMonth previous = selected.minusMonths(1);
        ReportContext context = context();
        Map<LocalDate, BigDecimal> dailyRevenue = selected.atDay(1).datesUntil(selected.atEndOfMonth().plusDays(1))
                .collect(Collectors.toMap(Function.identity(), ignored -> BigDecimal.ZERO, (a, b) -> a, LinkedHashMap::new));
        Map<UUID, MutableAggregate> movieRevenue = new HashMap<>();
        BigDecimal allTimeRevenue = BigDecimal.ZERO;
        BigDecimal monthRevenue = BigDecimal.ZERO;
        BigDecimal previousMonthRevenue = BigDecimal.ZERO;
        BigDecimal cinemaRevenue = BigDecimal.ZERO;
        BigDecimal onlineRevenue = BigDecimal.ZERO;
        long paidOrders = 0;

        for (Payment payment : context.payments) {
            if (payment.getStatus() != PaymentStatus.PAID || paymentDate(payment) == null) continue;
            allTimeRevenue = allTimeRevenue.add(payment.getAmount());
            YearMonth paymentMonth = YearMonth.from(paymentDate(payment));
            if (paymentMonth.equals(previous)) {
                previousMonthRevenue = previousMonthRevenue.add(payment.getAmount());
            }
            if (!paymentMonth.equals(selected)) continue;

            paidOrders += 1;
            monthRevenue = monthRevenue.add(payment.getAmount());
            dailyRevenue.merge(paymentDate(payment), payment.getAmount(), BigDecimal::add);
            Booking booking = context.bookings.get(payment.getBookingId());
            Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
            if (showtime != null && showtime.isOnline()) {
                onlineRevenue = onlineRevenue.add(payment.getAmount());
            } else {
                cinemaRevenue = cinemaRevenue.add(payment.getAmount());
            }
            if (showtime != null) {
                MutableAggregate aggregate = movieRevenue.computeIfAbsent(showtime.getMovieId(), ignored -> new MutableAggregate());
                aggregate.revenue = aggregate.revenue.add(payment.getAmount());
                aggregate.orders += 1;
            }
        }

        Map<UUID, Long> ticketsByMovie = new HashMap<>();
        context.tickets.stream()
                .filter(ticket -> ticket.getCreatedAt() != null && YearMonth.from(ticket.getCreatedAt()).equals(selected))
                .forEach(ticket -> {
                    Booking booking = context.bookings.get(ticket.getBookingId());
                    Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
                    if (booking != null && booking.getStatus() == BookingStatus.CONFIRMED && showtime != null) {
                        ticketsByMovie.merge(showtime.getMovieId(), 1L, Long::sum);
                    }
                });

        BigDecimal growthPercent = previousMonthRevenue.signum() == 0
                ? (monthRevenue.signum() == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(100))
                : monthRevenue.subtract(previousMonthRevenue)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(previousMonthRevenue, 1, java.math.RoundingMode.HALF_UP);
        List<Map<String, Object>> daily = dailyRevenue.entrySet().stream()
                .map(entry -> row("date", entry.getKey(), "revenue", entry.getValue()))
                .toList();
        List<Map<String, Object>> movies = movieRevenue.entrySet().stream()
                .sorted((left, right) -> right.getValue().revenue.compareTo(left.getValue().revenue))
                .map(entry -> {
                    Movie movie = context.movies.get(entry.getKey());
                    return row(
                            "movieId", entry.getKey(),
                            "movieTitle", movie == null ? "Không rõ" : movie.getTitle(),
                            "revenue", entry.getValue().revenue,
                            "orders", entry.getValue().orders,
                            "tickets", ticketsByMovie.getOrDefault(entry.getKey(), 0L)
                    );
                })
                .toList();

        return row(
                "year", year,
                "month", month,
                "allTimeRevenue", allTimeRevenue,
                "monthRevenue", monthRevenue,
                "previousMonthRevenue", previousMonthRevenue,
                "growthPercent", growthPercent,
                "cinemaRevenue", cinemaRevenue,
                "onlineRevenue", onlineRevenue,
                "paidOrders", paidOrders,
                "daily", daily,
                "movies", movies
        );
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

    public Map<String, Object> monthlyTicketAnalytics(int year, int month) {
        YearMonth selected = reportMonth(year, month);
        ReportContext context = context();
        Set<UUID> confirmedBookingIds = context.bookings.values().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .map(Booking::getId).collect(Collectors.toSet());
        List<Ticket> monthTickets = context.tickets.stream()
                .filter(ticket -> ticket.getCreatedAt() != null && YearMonth.from(ticket.getCreatedAt()).equals(selected))
                .filter(ticket -> confirmedBookingIds.contains(ticket.getBookingId())).toList();
        Set<UUID> monthBookingIds = monthTickets.stream().map(Ticket::getBookingId).collect(Collectors.toSet());
        Map<LocalDate, Long> soldByDate = selected.atDay(1).datesUntil(selected.atEndOfMonth().plusDays(1))
                .collect(Collectors.toMap(Function.identity(), ignored -> 0L, (a, b) -> a, LinkedHashMap::new));
        Map<LocalDate, Long> checkedInByDate = new LinkedHashMap<>(soldByDate);
        Map<UUID, MutableAggregate> movieStats = new HashMap<>();
        Map<UUID, Set<UUID>> movieOrders = new HashMap<>();
        long checkedIn = 0;
        for (Ticket ticket : monthTickets) {
            LocalDate date = ticket.getCreatedAt().toLocalDate();
            soldByDate.merge(date, 1L, Long::sum);
            if (ticket.isCheckedIn()) {
                checkedIn++;
                checkedInByDate.merge(date, 1L, Long::sum);
            }
            Booking booking = context.bookings.get(ticket.getBookingId());
            Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
            if (showtime == null) continue;
            movieStats.computeIfAbsent(showtime.getMovieId(), ignored -> new MutableAggregate()).count++;
            movieOrders.computeIfAbsent(showtime.getMovieId(), ignored -> new HashSet<>()).add(booking.getId());
        }
        BigDecimal revenue = BigDecimal.ZERO;
        for (Payment payment : context.payments) {
            LocalDate date = paymentDate(payment);
            if (payment.getStatus() != PaymentStatus.PAID || date == null || !YearMonth.from(date).equals(selected)
                    || !monthBookingIds.contains(payment.getBookingId())) continue;
            revenue = revenue.add(payment.getAmount());
            Booking booking = context.bookings.get(payment.getBookingId());
            Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
            if (showtime != null) movieStats.computeIfAbsent(showtime.getMovieId(), ignored -> new MutableAggregate()).revenue =
                    movieStats.get(showtime.getMovieId()).revenue.add(payment.getAmount());
        }
        List<Map<String, Object>> daily = soldByDate.keySet().stream()
                .map(date -> row("date", date, "tickets", soldByDate.get(date), "checkedIn", checkedInByDate.get(date))).toList();
        List<Map<String, Object>> movies = movieStats.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue().count, a.getValue().count))
                .map(entry -> row("movieId", entry.getKey(), "movieTitle",
                        context.movies.getOrDefault(entry.getKey(), Movie.builder().title("Không rõ").build()).getTitle(),
                        "tickets", entry.getValue().count, "orders", movieOrders.getOrDefault(entry.getKey(), Set.of()).size(),
                        "revenue", entry.getValue().revenue)).toList();
        Map.Entry<LocalDate, Long> peak = soldByDate.entrySet().stream().max(Map.Entry.comparingByValue()).orElse(null);
        long totalTickets = monthTickets.size();
        BigDecimal averageValue = totalTickets == 0 ? BigDecimal.ZERO
                : revenue.divide(BigDecimal.valueOf(totalTickets), 0, java.math.RoundingMode.HALF_UP);
        return row("year", year, "month", month, "allTimeTickets", context.tickets.stream()
                        .filter(ticket -> confirmedBookingIds.contains(ticket.getBookingId())).count(),
                "totalTickets", totalTickets, "paidOrders", monthBookingIds.size(), "checkedInTickets", checkedIn,
                "checkInRate", totalTickets == 0 ? 0 : Math.round(checkedIn * 1000d / totalTickets) / 10d,
                "totalRevenue", revenue, "averageTicketValue", averageValue,
                "peakDate", peak == null ? null : peak.getKey(), "peakTickets", peak == null ? 0 : peak.getValue(),
                "daily", daily, "movies", movies);
    }

    public Map<String, Object> monthlyCustomerAnalytics(int year, int month) {
        YearMonth selected = reportMonth(year, month);
        ReportContext context = context();
        List<User> members = context.users.values().stream().filter(user -> user.getRole() == User.Role.MEMBER).toList();
        Set<UUID> memberIds = members.stream().map(User::getId).collect(Collectors.toSet());
        List<Booking> confirmed = context.bookings.values().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED && memberIds.contains(booking.getUserId())).toList();
        Map<UUID, List<Booking>> byCustomer = confirmed.stream().collect(Collectors.groupingBy(Booking::getUserId));
        List<Booking> monthBookings = confirmed.stream().filter(booking -> YearMonth.from(bookingDate(booking)).equals(selected)).toList();
        Set<UUID> activeIds = monthBookings.stream().map(Booking::getUserId).collect(Collectors.toSet());
        Set<UUID> newBuyerIds = activeIds.stream().filter(userId -> byCustomer.getOrDefault(userId, List.of()).stream()
                .map(this::bookingDate).min(LocalDate::compareTo).map(date -> YearMonth.from(date).equals(selected)).orElse(false))
                .collect(Collectors.toSet());
        Set<UUID> returningIds = new HashSet<>(activeIds);
        returningIds.removeAll(newBuyerIds);
        Map<UUID, BigDecimal> spend = new HashMap<>();
        Set<UUID> monthBookingIds = monthBookings.stream().map(Booking::getId).collect(Collectors.toSet());
        for (Payment payment : context.payments) {
            LocalDate date = paymentDate(payment);
            Booking booking = context.bookings.get(payment.getBookingId());
            if (payment.getStatus() == PaymentStatus.PAID && date != null && YearMonth.from(date).equals(selected)
                    && booking != null && memberIds.contains(booking.getUserId())) {
                spend.merge(booking.getUserId(), payment.getAmount(), BigDecimal::add);
            }
        }
        BigDecimal totalSpend = spend.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageSpend = activeIds.isEmpty() ? BigDecimal.ZERO
                : totalSpend.divide(BigDecimal.valueOf(activeIds.size()), 0, java.math.RoundingMode.HALF_UP);
        Map<LocalDate, Set<UUID>> activeByDate = selected.atDay(1).datesUntil(selected.atEndOfMonth().plusDays(1))
                .collect(Collectors.toMap(Function.identity(), ignored -> new HashSet<>(), (a, b) -> a, LinkedHashMap::new));
        Map<LocalDate, Long> ordersByDate = selected.atDay(1).datesUntil(selected.atEndOfMonth().plusDays(1))
                .collect(Collectors.toMap(Function.identity(), ignored -> 0L, (a, b) -> a, LinkedHashMap::new));
        monthBookings.forEach(booking -> {
            LocalDate date = bookingDate(booking);
            activeByDate.get(date).add(booking.getUserId());
            ordersByDate.merge(date, 1L, Long::sum);
        });
        List<Map<String, Object>> daily = activeByDate.keySet().stream()
                .map(date -> row("date", date, "activeCustomers", activeByDate.get(date).size(), "orders", ordersByDate.get(date))).toList();
        List<Map<String, Object>> topCustomers = activeIds.stream().map(userId -> {
                    User user = context.users.get(userId);
                    List<Booking> orders = monthBookings.stream().filter(booking -> booking.getUserId().equals(userId)).toList();
                    LocalDate lastPurchase = orders.stream().map(this::bookingDate).max(LocalDate::compareTo).orElse(null);
                    return row("customerId", userId, "name", user == null ? "Không rõ" : user.getFullName(),
                            "email", user == null ? "" : user.getEmail(), "orders", orders.size(),
                            "spend", spend.getOrDefault(userId, BigDecimal.ZERO), "lastPurchase", lastPurchase,
                            "segment", byCustomer.getOrDefault(userId, List.of()).size() >= 5 ? "LOYAL" : returningIds.contains(userId) ? "RETURNING" : "NEW");
                }).sorted((a, b) -> ((BigDecimal) b.get("spend")).compareTo((BigDecimal) a.get("spend"))).limit(10).toList();
        long loyal = byCustomer.values().stream().filter(items -> items.size() >= 5).count();
        long repeat = byCustomer.values().stream().filter(items -> items.size() >= 2 && items.size() < 5).count();
        long oneTime = byCustomer.values().stream().filter(items -> items.size() == 1).count();
        long noPurchase = members.size() - byCustomer.size();
        return row("year", year, "month", month, "totalMembers", members.size(), "activeCustomers", activeIds.size(),
                "newBuyers", newBuyerIds.size(), "returningCustomers", returningIds.size(), "loyalCustomers", loyal,
                "customersWithoutPurchase", noPurchase, "monthOrders", monthBookingIds.size(), "monthSpend", totalSpend,
                "averageSpend", averageSpend, "repeatRate", activeIds.isEmpty() ? 0 : Math.round(returningIds.size() * 1000d / activeIds.size()) / 10d,
                "segments", List.of(row("key", "LOYAL", "label", "Trung thành (≥5 đơn)", "count", loyal),
                        row("key", "REPEAT", "label", "Mua lại (2–4 đơn)", "count", repeat),
                        row("key", "ONE_TIME", "label", "Mua một lần", "count", oneTime),
                        row("key", "NO_PURCHASE", "label", "Chưa mua", "count", noPurchase)),
                "daily", daily, "topCustomers", topCustomers);
    }

    public Map<String, Object> onlineMovieSales(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        ReportContext context = context();
        Map<LocalDate, Long> salesByDate = emptyCountDays(range);
        Map<LocalDate, Long> viewsByDate = emptyCountDays(range);
        Map<LocalDate, BigDecimal> revenueByDate = emptyMoneyDays(range);

        context.payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> paymentDate(payment) != null && range.contains(paymentDate(payment)))
                .forEach(payment -> {
                    Booking booking = context.bookings.get(payment.getBookingId());
                    Showtime showtime = booking == null ? null : context.showtimes.get(booking.getShowtimeId());
                    if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED || showtime == null || !showtime.isOnline()) {
                        return;
                    }
                    LocalDate date = paymentDate(payment);
                    salesByDate.merge(date, 1L, Long::sum);
                    revenueByDate.merge(date, payment.getAmount(), BigDecimal::add);
                });

        onlineMovieViewRepository.findByViewedAtBetween(range.from.atStartOfDay(), range.to.plusDays(1).atStartOfDay().minusNanos(1)).stream()
                .map(OnlineMovieView::getViewedAt)
                .filter(viewedAt -> viewedAt != null && range.contains(viewedAt.toLocalDate()))
                .forEach(viewedAt -> viewsByDate.merge(viewedAt.toLocalDate(), 1L, Long::sum));

        List<Map<String, Object>> daily = range.days().stream()
                .map(date -> {
                    long sales = salesByDate.getOrDefault(date, 0L);
                    long views = viewsByDate.getOrDefault(date, 0L);
                    return row("date", date, "sales", sales, "views", views,
                            "revenue", revenueByDate.getOrDefault(date, BigDecimal.ZERO));
                }).toList();
        long totalSales = salesByDate.values().stream().mapToLong(Long::longValue).sum();
        long totalViews = viewsByDate.values().stream().mapToLong(Long::longValue).sum();
        BigDecimal totalRevenue = revenueByDate.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return row("from", range.from, "to", range.to, "totalSales", totalSales, "totalViews", totalViews,
                "onlineSales", totalSales, "viewCount", totalViews, "totalRevenue", totalRevenue, "daily", daily,
                "available", true);
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
        ReportContext context = context();
        Map<LocalDate, BigDecimal> revenueByDate = context.payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .filter(payment -> paymentDate(payment) != null)
                .filter(payment -> today.equals(paymentDate(payment)) || yesterday.equals(paymentDate(payment)))
                .collect(Collectors.groupingBy(this::paymentDate,
                        Collectors.reducing(BigDecimal.ZERO, Payment::getAmount, BigDecimal::add)));
        BigDecimal todayRevenue = revenueByDate.getOrDefault(today, BigDecimal.ZERO);
        BigDecimal yesterdayRevenue = revenueByDate.getOrDefault(yesterday, BigDecimal.ZERO);
        Set<UUID> confirmedBookingIds = context.bookings.values().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .map(Booking::getId)
                .collect(Collectors.toSet());
        Map<LocalDate, Long> ticketsByDate = context.tickets.stream()
                .filter(ticket -> confirmedBookingIds.contains(ticket.getBookingId()))
                .filter(ticket -> ticket.getCreatedAt() != null)
                .filter(ticket -> today.equals(ticket.getCreatedAt().toLocalDate()) || yesterday.equals(ticket.getCreatedAt().toLocalDate()))
                .collect(Collectors.groupingBy(ticket -> ticket.getCreatedAt().toLocalDate(), Collectors.counting()));
        long todayTickets = ticketsByDate.getOrDefault(today, 0L);
        long yesterdayTickets = ticketsByDate.getOrDefault(yesterday, 0L);
        LocalDateTime now = LocalDateTime.now();
        long activeScreenings = context.showtimes.values().stream()
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .filter(showtime -> !showtime.getStartTime().isAfter(now) && showtime.getEndTime().isAfter(now))
                .count();

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

    private LocalDate paymentDate(Payment payment) {
        LocalDateTime timestamp = payment.getPaidAt() != null ? payment.getPaidAt() : payment.getCreatedAt();
        return timestamp == null ? null : timestamp.toLocalDate();
    }

    private LocalDate bookingDate(Booking booking) {
        LocalDateTime timestamp = booking.getConfirmedAt() != null ? booking.getConfirmedAt() : booking.getCreatedAt();
        return timestamp.toLocalDate();
    }

    private YearMonth reportMonth(int year, int month) {
        try { return YearMonth.of(year, month); }
        catch (RuntimeException exception) { throw new IllegalArgumentException("Invalid report month"); }
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

    private static class MutableAggregate {
        long count;
        long orders;
        BigDecimal revenue = BigDecimal.ZERO;
    }
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
