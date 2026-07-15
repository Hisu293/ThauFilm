package com.filmticket.service;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
import com.filmticket.entity.Showtime;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.OnlineMovieViewRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TicketRepository;
import com.filmticket.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StaffReportServiceMonthlyRevenueTest {

    @Test
    void returnsAllTimeMonthlyAndPerMoviePaidRevenue() {
        UUID bookingId = UUID.randomUUID();
        UUID showtimeId = UUID.randomUUID();
        UUID movieId = UUID.randomUUID();
        PaymentRepository payments = mock(PaymentRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
        MovieRepository movies = mock(MovieRepository.class);
        TicketRepository tickets = mock(TicketRepository.class);
        CinemaRoomRepository rooms = mock(CinemaRoomRepository.class);
        UserRepository users = mock(UserRepository.class);
        OnlineMovieViewRepository views = mock(OnlineMovieViewRepository.class);

        Payment selectedPayment = Payment.builder()
                .bookingId(bookingId)
                .amount(new BigDecimal("150000"))
                .status(PaymentStatus.PAID)
                .paidAt(LocalDateTime.of(2026, 7, 10, 9, 0))
                .build();
        Payment olderPayment = Payment.builder()
                .bookingId(UUID.randomUUID())
                .amount(new BigDecimal("50000"))
                .status(PaymentStatus.PAID)
                .paidAt(LocalDateTime.of(2026, 5, 1, 9, 0))
                .build();
        Booking booking = Booking.builder().id(bookingId).showtimeId(showtimeId).status(BookingStatus.CONFIRMED).build();
        Showtime showtime = Showtime.builder().id(showtimeId).movieId(movieId).online(false).build();
        Movie movie = Movie.builder().id(movieId).title("Phim kiểm thử").build();

        when(payments.findAll()).thenReturn(List.of(selectedPayment, olderPayment));
        when(bookings.findAll()).thenReturn(List.of(booking));
        when(showtimes.findAll()).thenReturn(List.of(showtime));
        when(movies.findAll()).thenReturn(List.of(movie));
        when(tickets.findAll()).thenReturn(List.of());
        when(rooms.findAll()).thenReturn(List.of());
        when(users.findAll()).thenReturn(List.of());

        StaffReportService service = new StaffReportService(payments, tickets, bookings, showtimes, movies, rooms, users, views);
        Map<String, Object> report = service.monthlyRevenue(2026, 7);

        assertEquals(new BigDecimal("200000"), report.get("allTimeRevenue"));
        assertEquals(new BigDecimal("150000"), report.get("monthRevenue"));
        assertEquals(1L, report.get("paidOrders"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> movieRows = (List<Map<String, Object>>) report.get("movies");
        assertEquals("Phim kiểm thử", movieRows.get(0).get("movieTitle"));
        assertEquals(new BigDecimal("150000"), movieRows.get(0).get("revenue"));
    }
}
