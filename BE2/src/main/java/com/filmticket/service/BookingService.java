package com.filmticket.service;

import com.filmticket.dto.*;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;

    private static final int HOLD_MINUTES = 15;

    @Transactional(readOnly = true)
    public List<ShowtimeSeatResponse> getAvailableSeats(UUID showtimeId) {
        if (!showtimeRepository.existsById(showtimeId)) {
            throw new BadRequestException("Showtime not found");
        }
        return seatAvailabilityRepository.findByShowtimeIdOrderBySeatRowNameAscSeatSeatNumberAsc(showtimeId)
                .stream()
                .map(ShowtimeSeatResponse::fromSeatAvailability)
                .toList();
    }

    @Transactional
    public BookingResponse createBooking(UUID userId, CreateBookingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Showtime not found"));

        if (showtime.getStartTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Cannot book a past showtime");
        }

        List<SeatAvailability> availabilities = new ArrayList<>();
        List<Seat> seats = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (UUID seatId : request.getSeatIds()) {
            SeatAvailability av = seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(request.getShowtimeId(), seatId)
                    .orElseThrow(() -> new BadRequestException("Seat not found in this showtime: " + seatId));

            if (!av.isAvailable()) {
                throw new BadRequestException("Seat is already taken: " + av.getSeat().getRowName() + av.getSeat().getSeatNumber());
            }
            availabilities.add(av);
            seats.add(av.getSeat());
            total = total.add(av.getPrice());
        }

        // Mark seats as unavailable
        for (SeatAvailability av : availabilities) {
            av.setAvailable(false);
        }
        seatAvailabilityRepository.saveAll(availabilities);

        // Create booking
        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .totalAmount(total)
                .status(BookingStatus.PENDING)
                .confirmationCode(generateConfirmationCode())
                .holdExpiresAt(LocalDateTime.now().plusMinutes(HOLD_MINUTES))
                .build();

        // Link seats
        for (int i = 0; i < seats.size(); i++) {
            BookingSeat bs = BookingSeat.builder()
                    .seat(seats.get(i))
                    .priceAtBooking(availabilities.get(i).getPrice())
                    .build();
            booking.addSeat(bs);
        }

        booking = bookingRepository.save(booking);
        return toBookingResponse(booking);
    }

    @Transactional
    public BookingPaymentResponse payBooking(UUID bookingId, UUID userId, PayBookingRequest request) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Booking is not in pending status");
        }
        if (booking.getHoldExpiresAt().isBefore(LocalDateTime.now())) {
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
            throw new BadRequestException("Booking hold has expired");
        }

        // Simulate payment
        Payment payment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.PAID)
                .transactionId(UUID.randomUUID().toString())
                .paidAt(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        // Confirm booking
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        // Generate tickets
        List<Ticket> tickets = new ArrayList<>();
        for (BookingSeat bs : booking.getBookingSeats()) {
            Ticket ticket = Ticket.builder()
                    .booking(booking)
                    .seatId(bs.getSeat().getId())
                    .ticketCode(generateTicketCode())
                    .checkedIn(false)
                    .build();
            tickets.add(ticketRepository.save(ticket));
        }

        List<TicketResponse> ticketResponses = tickets.stream()
                .map(TicketResponse::fromTicket)
                .toList();

        return BookingPaymentResponse.builder()
                .booking(toBookingResponse(booking))
                .payment(PaymentResponse.fromPayment(payment))
                .tickets(ticketResponses)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toBookingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingDetail(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        return toBookingResponse(booking);
    }

    @Transactional
    public TicketResponse checkIn(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));

        if (ticket.isCheckedIn()) {
            throw new BadRequestException("Ticket already checked in");
        }
        if (ticket.getBooking().getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking is not confirmed");
        }

        ticket.setCheckedIn(true);
        ticket = ticketRepository.save(ticket);
        return TicketResponse.fromTicket(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getBookingTickets(UUID bookingId, UUID userId) {
        bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        return ticketRepository.findByBookingId(bookingId).stream()
                .map(TicketResponse::fromTicket)
                .toList();
    }

    private BookingResponse toBookingResponse(Booking booking) {
        List<ShowtimeSeatResponse> seats = booking.getBookingSeats().stream()
                .map(bs -> ShowtimeSeatResponse.builder()
                        .seatId(bs.getSeat().getId())
                        .rowName(bs.getSeat().getRowName())
                        .seatNumber(bs.getSeat().getSeatNumber())
                        .type(bs.getSeat().getType())
                        .available(false)
                        .price(bs.getPriceAtBooking())
                        .build())
                .collect(Collectors.toList());
        return BookingResponse.fromBooking(booking, seats);
    }

    private String generateConfirmationCode() {
        return "BK" + String.format("%06d", new Random().nextInt(999999));
    }

    private String generateTicketCode() {
        return "TK" + String.format("%06d", new Random().nextInt(999999));
    }
}
