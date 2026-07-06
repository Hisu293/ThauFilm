package com.filmticket.service;

import com.filmticket.dto.BookingResponse;
import com.filmticket.dto.ShowtimeSeatResponse;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffBookingService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final TicketRepository ticketRepository;
    private final BookingService bookingService;
    private final TheaterRepository theaterRepository;
    private final PaymentGatewayService paymentGatewayService;

    public List<BookingResponse> listBookings() {
        List<Booking> bookings = bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (bookings.isEmpty()) return List.of();
        return enrichBookings(bookings, null);
    }

    public BookingResponse getBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        List<BookingResponse> enriched = enrichBookings(List.of(booking), bookingId);
        return enriched.isEmpty() ? null : enriched.get(0);
    }

    private List<BookingResponse> enrichBookings(List<Booking> bookings, UUID targetBookingId) {
        Set<UUID> bookingIds = bookings.stream().map(Booking::getId).collect(Collectors.toSet());
        Set<UUID> userIds = bookings.stream().map(Booking::getUserId).collect(Collectors.toSet());
        Set<UUID> showtimeIds = bookings.stream().map(Booking::getShowtimeId).collect(Collectors.toSet());

        Map<UUID, String> userNameById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
        Map<UUID, String> userEmailById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(User::getId, User::getEmail, (a, b) -> a));
        Map<UUID, String> userPhoneById = userRepository.findAllById(userIds).stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(User::getId, u -> u.getPhone() != null ? u.getPhone() : "", (a, b) -> a));

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

        List<Ticket> allTickets = targetBookingId != null
                ? ticketRepository.findByBookingId(targetBookingId)
                : ticketRepository.findByBookingIdIn(bookingIds);

        Map<UUID, List<Ticket>> ticketsByBookingId = allTickets.stream()
                .collect(Collectors.groupingBy(Ticket::getBookingId));

        Set<UUID> allSeatIds = allTickets.stream().map(Ticket::getSeatId).collect(Collectors.toSet());
        Map<UUID, Seat> seatsById = seatRepository.findAllById(allSeatIds).stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(Seat::getId, s -> s, (a, b) -> a));

        Map<String, BigDecimal> priceBySeatId = seatAvailabilityRepository
                .findAllByShowtimeIdInAndSeatIdIn(showtimeIds, allSeatIds).stream()
                .collect(Collectors.toMap(
                        sa -> sa.getShowtimeId() + "|" + sa.getSeatId(),
                        sa -> sa.getPrice(),
                        (a, b) -> a
                ));

        Map<UUID, com.filmticket.entity.Payment> paymentByBookingId = paymentRepository.findAllByBookingIdIn(bookingIds).stream()
                .filter(p -> p.getBookingId() != null)
                .collect(Collectors.groupingBy(com.filmticket.entity.Payment::getBookingId,
                        Collectors.collectingAndThen(Collectors.toList(), this::selectPreferredPayment)));

        Map<UUID, Showtime> finalShowtimesById = showtimesById;
        Map<UUID, Movie> finalMoviesById = moviesById;
        Map<UUID, CinemaRoom> finalRoomsById = roomsById;
        Map<UUID, Theater> finalTheatersById = theatersById;
        Map<UUID, Seat> finalSeatsById = seatsById;
        Map<UUID, String> finalUserNameById = userNameById;
        Map<UUID, String> finalUserEmailById = userEmailById;
        Map<UUID, String> finalUserPhoneById = userPhoneById;
        Map<UUID, com.filmticket.entity.Payment> finalPaymentByBookingId = paymentByBookingId;

        return bookings.stream()
                .map(booking -> {
                    String movieTitle = Optional.ofNullable(finalShowtimesById.get(booking.getShowtimeId()))
                            .map(s -> finalMoviesById.get(s.getMovieId()))
                            .map(Movie::getTitle).orElse(null);
                    CinemaRoom room = Optional.ofNullable(finalShowtimesById.get(booking.getShowtimeId()))
                            .map(s -> finalRoomsById.get(s.getCinemaRoomId())).orElse(null);
                    Theater theater = room != null ? finalTheatersById.get(room.getTheaterId()) : null;
                    com.filmticket.entity.Payment payment = finalPaymentByBookingId.get(booking.getId());

                    List<ShowtimeSeatResponse> seatResponses = ticketsByBookingId
                            .getOrDefault(booking.getId(), List.of()).stream()
                            .map(ticket -> {
                                Seat seat = finalSeatsById.get(ticket.getSeatId());
                                String seatLabel = seat != null ? seat.getRowName() + seat.getSeatNumber() : null;
                                String seatType = seat != null && seat.getType() != null ? seat.getType().name() : null;
                                String priceKey = booking.getShowtimeId() + "|" + ticket.getSeatId();
                                BigDecimal price = priceBySeatId.getOrDefault(priceKey, BigDecimal.ZERO);
                                return ShowtimeSeatResponse.builder()
                                        .seatId(ticket.getSeatId())
                                        .rowName(seat != null ? seat.getRowName() : null)
                                        .seatNumber(seat != null ? seat.getSeatNumber() : null)
                                        .label(seatLabel)
                                        .type(seatType)
                                        .status(SeatBookingStatus.BOOKED)
                                        .price(price)
                                        .build();
                            }).toList();

                    return BookingResponse.builder()
                            .id(booking.getId())
                            .userId(booking.getUserId())
                            .customerName(finalUserNameById.get(booking.getUserId()))
                            .customerEmail(finalUserEmailById.get(booking.getUserId()))
                            .customerPhone(finalUserPhoneById.get(booking.getUserId()))
                            .showtimeId(booking.getShowtimeId())
                            .movieTitle(movieTitle)
                            .cinemaRoomId(room != null ? room.getId() : null)
                            .cinemaRoomName(room != null ? room.getName() : null)
                            .theaterId(theater != null ? theater.getId() : null)
                            .theaterName(theater != null ? theater.getName() : null)
                            .theaterId(theater != null ? theater.getId() : null)
                            .theaterName(theater != null ? theater.getName() : null)
                            .startTime(Optional.ofNullable(finalShowtimesById.get(booking.getShowtimeId())).map(Showtime::getStartTime).orElse(null))
                            .totalAmount(booking.getTotalAmount())
                            .status(booking.getStatus().name())
                            .accessGranted(booking.getStatus() == BookingStatus.CONFIRMED)
                            .confirmationCode(booking.getConfirmationCode())
                            .createdAt(booking.getCreatedAt())
                            .holdExpiresAt(booking.getHoldExpiresAt())
                            .confirmedAt(booking.getConfirmedAt())
                            .seats(seatResponses)
                            .paymentMethod(payment != null ? payment.getPaymentMethod() : null)
                            .paymentStatus(payment != null && payment.getStatus() != null ? payment.getStatus().name() : null)
                            .paymentAmount(payment != null ? payment.getAmount() : null)
                            .build();
                }).toList();
    }

    private com.filmticket.entity.Payment selectPreferredPayment(List<com.filmticket.entity.Payment> payments) {
        return payments.stream()
                .max(Comparator
                        .comparing((com.filmticket.entity.Payment payment) -> payment.getStatus() == PaymentStatus.PAID)
                        .thenComparing(com.filmticket.entity.Payment::getPaidAt, Comparator.nullsFirst(LocalDateTime::compareTo))
                        .thenComparing(com.filmticket.entity.Payment::getCreatedAt, Comparator.nullsFirst(LocalDateTime::compareTo)))
                .orElse(null);
    }

    public Object checkPayment(UUID bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Payment not found"));
    }

    public Object checkAccess(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .toList();
    }

    @Transactional
    public Object regrantAccess(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() != BookingStatus.EXPIRED && booking.getStatus() != BookingStatus.CANCELLED) {
            throw new BadRequestException("Can only regrant access for EXPIRED or CANCELLED bookings");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        return getBooking(bookingId);
    }

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() == BookingStatus.HOLD) {
            bookingService.releaseSeats(booking);
            booking.setStatus(BookingStatus.CANCELLED);
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CANCELLED);
        } else if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Cannot cancel an already expired booking");
        } else {
            throw new BadRequestException("Booking is already cancelled");
        }

        bookingRepository.save(booking);
        return getBooking(bookingId);
    }

    @Transactional
    public BookingResponse refund(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Can only refund CONFIRMED bookings");
        }

        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Payment not found"));
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Can only refund PAID payments");
        }

        PaymentGatewayService.GatewayRefund refund = paymentGatewayService.refund(payment, "Staff cancelled booking");
        payment.setStatus(refund.status());
        payment.setProviderRefundId(refund.refundId());
        payment.setRefundReason("Staff cancelled booking");
        payment.setRefundFailedReason(refund.failureReason());
        if (refund.status() == PaymentStatus.REFUNDED) {
            payment.setRefundedAt(java.time.LocalDateTime.now());
        }
        paymentRepository.save(payment);

        if (refund.status() == PaymentStatus.REFUND_FAILED || refund.status() == PaymentStatus.REFUND_PENDING) {
            return getBooking(bookingId);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingService.releaseSeats(booking);
        bookingRepository.save(booking);
        return getBooking(bookingId);
    }
}
