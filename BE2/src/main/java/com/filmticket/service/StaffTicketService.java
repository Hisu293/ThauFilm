package com.filmticket.service;

import com.filmticket.dto.TicketResponse;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Seat;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.Theater;
import com.filmticket.entity.Ticket;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.util.TicketPdfGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffTicketService {

    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final BookingService bookingService;
    private final TicketPdfGenerator ticketPdfGenerator;
    private final TheaterRepository theaterRepository;

    public List<TicketResponse> listTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        if (tickets.isEmpty()) return List.of();

        Set<UUID> bookingIds = tickets.stream().map(Ticket::getBookingId).collect(Collectors.toSet());
        Set<UUID> seatIds = tickets.stream().map(Ticket::getSeatId).collect(Collectors.toSet());

        Map<UUID, Booking> bookingsById = bookingRepository.findAllById(bookingIds).stream()
                .filter(b -> b.getId() != null)
                .collect(Collectors.toMap(Booking::getId, b -> b, (a, b) -> a));

        Set<UUID> userIds = bookingsById.values().stream().map(Booking::getUserId).collect(Collectors.toSet());
        Set<UUID> showtimeIds = bookingsById.values().stream().map(Booking::getShowtimeId).collect(Collectors.toSet());
        Set<UUID> seatIdsOnly = new HashSet<>(seatIds);

        Map<UUID, String> userNameById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName(), (a, b) -> a));
        Map<UUID, String> userEmailById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getEmail(), (a, b) -> a));
        Map<UUID, String> userPhoneById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getPhone() != null ? u.getPhone() : "", (a, b) -> a));

        Map<UUID, Showtime> showtimesById = showtimeRepository.findAllById(showtimeIds).stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(Showtime::getId, s -> s, (a, b) -> a));

        Set<UUID> movieIds = showtimesById.values().stream().map(Showtime::getMovieId).collect(Collectors.toSet());
        Set<UUID> roomIds = showtimesById.values().stream().map(Showtime::getCinemaRoomId).collect(Collectors.toSet());

        Map<UUID, Movie> moviesById = movieRepository.findAllById(movieIds).stream()
                .filter(m -> m.getId() != null)
                .collect(Collectors.toMap(Movie::getId, m -> m, (a, b) -> a));
        Map<UUID, CinemaRoom> roomsById = cinemaRoomRepository.findAllById(roomIds).stream()
                .filter(r -> r.getId() != null)
                .collect(Collectors.toMap(CinemaRoom::getId, r -> r, (a, b) -> a));

        Set<UUID> theaterIds = roomsById.values().stream().map(CinemaRoom::getTheaterId).collect(Collectors.toSet());
        Map<UUID, Theater> theatersById = theaterRepository.findAllById(theaterIds).stream()
                .filter(t -> t.getId() != null)
                .collect(Collectors.toMap(Theater::getId, t -> t, (a, b) -> a));

        Map<UUID, Seat> seatsById = seatRepository.findAllById(seatIdsOnly).stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(Seat::getId, s -> s, (a, b) -> a));

        Map<String, BigDecimal> priceBySeatId = seatAvailabilityRepository
                .findAllByShowtimeIdInAndSeatIdIn(showtimeIds, seatIdsOnly).stream()
                .collect(Collectors.toMap(
                        sa -> sa.getShowtimeId() + "|" + sa.getSeatId(),
                        sa -> sa.getPrice(),
                        (a, b) -> a
                ));

        Map<UUID, com.filmticket.entity.Payment> paymentByBookingId = paymentRepository.findAllByBookingIdIn(bookingIds).stream()
                .filter(p -> p.getBookingId() != null)
                .collect(Collectors.toMap(com.filmticket.entity.Payment::getBookingId, p -> p, (a, b) -> a));

        Map<UUID, Showtime> finalShowtimesById = showtimesById;
        Map<UUID, String> finalUserNameById = userNameById;
        Map<UUID, String> finalUserEmailById = userEmailById;
        Map<UUID, String> finalUserPhoneById = userPhoneById;
        Map<UUID, Movie> finalMoviesById = moviesById;
        Map<UUID, CinemaRoom> finalRoomsById = roomsById;
        Map<UUID, Theater> finalTheatersById = theatersById;
        Map<UUID, Seat> finalSeatsById = seatsById;
        Map<UUID, com.filmticket.entity.Payment> finalPaymentByBookingId = paymentByBookingId;

        return tickets.stream()
                .map(ticket -> {
                    Booking booking = bookingsById.get(ticket.getBookingId());
                    if (booking == null) return TicketResponse.fromTicket(ticket);

                    Showtime showtime = finalShowtimesById.get(booking.getShowtimeId());
                    Movie movie = showtime != null ? finalMoviesById.get(showtime.getMovieId()) : null;
                    CinemaRoom room = showtime != null ? finalRoomsById.get(showtime.getCinemaRoomId()) : null;
                    Theater theater = room != null ? finalTheatersById.get(room.getTheaterId()) : null;
                    Seat seat = finalSeatsById.get(ticket.getSeatId());
                    com.filmticket.entity.Payment payment = finalPaymentByBookingId.get(booking.getId());

                    String seatLabel = seat != null ? seat.getRowName() + seat.getSeatNumber() : null;
                    String seatType = seat != null && seat.getType() != null ? seat.getType().name() : null;

                    String priceKey = showtime != null ? showtime.getId() + "|" + ticket.getSeatId() : null;
                    BigDecimal price = priceKey != null ? priceBySeatId.getOrDefault(priceKey, BigDecimal.ZERO) : BigDecimal.ZERO;

                    return TicketResponse.builder()
                            .id(ticket.getId())
                            .bookingId(ticket.getBookingId())
                            .seatId(ticket.getSeatId())
                            .ticketCode(ticket.getTicketCode())
                            .checkedIn(ticket.isCheckedIn())
                            .confirmationCode(booking.getConfirmationCode())
                            .bookingStatus(booking.getStatus().name())
                            .customerName(finalUserNameById.get(booking.getUserId()))
                            .customerEmail(finalUserEmailById.get(booking.getUserId()))
                            .customerPhone(finalUserPhoneById.get(booking.getUserId()))
                            .showtimeId(booking.getShowtimeId())
                            .startTime(showtime != null ? showtime.getStartTime() : null)
                            .endTime(showtime != null ? showtime.getEndTime() : null)
                            .movieId(movie != null ? movie.getId() : null)
                            .movieTitle(movie != null ? movie.getTitle() : null)
                            .cinemaRoomId(room != null ? room.getId() : null)
                            .cinemaRoomName(room != null ? room.getName() : null)
                            .theaterId(theater != null ? theater.getId() : null)
                            .theaterName(theater != null ? theater.getName() : null)
                            .seatLabel(seatLabel)
                            .seatType(seatType)
                            .price(price)
                            .paymentMethod(payment != null ? payment.getPaymentMethod() : null)
                            .paymentStatus(payment != null && payment.getStatus() != null ? payment.getStatus().name() : null)
                            .build();
                })
                .toList();
    }

    public TicketResponse getTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        List<TicketResponse> responses = listTickets();
        return responses.stream()
                .filter(t -> t.getId().equals(ticketId))
                .findFirst()
                .orElse(TicketResponse.fromTicket(ticket));
    }

    public Object checkPayment(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        return paymentRepository.findByBookingId(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Payment not found"));
    }

    @Transactional
    public TicketResponse cancelTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("Ticket already cancelled");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        List<TicketResponse> responses = listTickets();
        return responses.stream()
                .filter(t -> t.getId().equals(ticketId))
                .findFirst()
                .orElse(TicketResponse.fromTicket(ticket));
    }

    @Transactional
    public TicketResponse checkIn(String ticketCode) {
        return bookingService.checkIn(ticketCode);
    }

    public ResponseEntity<ByteArrayResource> reprintTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        try {
            byte[] pdf = ticketPdfGenerator.generateTicketPdf(booking, tickets);
            ByteArrayResource resource = new ByteArrayResource(pdf);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + ticket.getTicketCode() + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception ex) {
            throw new BadRequestException("Failed to reprint ticket: " + ex.getMessage());
        }
    }
}
