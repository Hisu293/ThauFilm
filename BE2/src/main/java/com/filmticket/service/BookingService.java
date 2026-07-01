package com.filmticket.service;

import com.filmticket.dto.*;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.*;
import com.filmticket.util.TicketPdfGenerator;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final UserRepository userRepository;
    private final SeatRepository seatRepository;
    private final ComboService comboService;
    private final DiscountService discountService;
    private final JavaMailSender mailSender;
    private final TicketPdfGenerator ticketPdfGenerator;
    private final RealtimeEventService realtimeEventService;
    private final ApplicationEventPublisher eventPublisher;
    private final PaymentGatewayService paymentGatewayService;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String mailFrom;

    private static final int HOLD_MINUTES = 10;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private LocalDateTime now() {
        return LocalDateTime.now(VIETNAM_ZONE);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeSeatResponse> getAvailableSeats(UUID showtimeId) {
        if (!showtimeRepository.existsById(showtimeId)) {
            throw new BadRequestException("Showtime not found");
        }
        List<SeatAvailability> availabilities = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        List<UUID> seatIds = availabilities.stream()
                .map(SeatAvailability::getSeatId)
                .toList();

        Map<UUID, Seat> seatById = seatRepository.findAllById(seatIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(Seat::getId, seat -> seat));

        return availabilities.stream()
                .map(availability -> {
                    Seat seat = seatById.get(availability.getSeatId());
                    ShowtimeSeatResponse response = ShowtimeSeatResponse.fromSeatAvailability(availability);
                    if (seat != null) {
                        response.setRowName(seat.getRowName());
                        response.setSeatNumber(seat.getSeatNumber());
                        response.setType(seat.getType().toStorageValue());
                    }
                    return response;
                })
                .sorted(Comparator
                        .comparing((ShowtimeSeatResponse seat) -> {
                            String rowName = seat.getRowName();
                            return rowName != null ? rowName : "";
                        })
                        .thenComparing(seat -> {
                            Integer seatNumber = seat.getSeatNumber();
                            return seatNumber != null ? seatNumber : 0;
                        }))
                .toList();
    }

    @Transactional(readOnly = true)
    public SeatSuggestionResponse suggestSeats(UUID showtimeId, int count) {
        if (count < 1 || count > 8) {
            throw new BadRequestException("Số ghế cần tìm phải từ 1 đến 8");
        }
        List<ShowtimeSeatResponse> availableSeats = getAvailableSeats(showtimeId).stream()
                .filter(seat -> seat.getStatus() == SeatBookingStatus.AVAILABLE)
                .filter(seat -> seat.getRowName() != null && seat.getSeatNumber() != null)
                .sorted(Comparator.comparing(ShowtimeSeatResponse::getRowName)
                        .thenComparing(ShowtimeSeatResponse::getSeatNumber))
                .toList();
        if (availableSeats.size() < count) {
            throw new BadRequestException("Không còn đủ " + count + " ghế trống cho suất chiếu này");
        }

        Candidate exact = findExactAdjacentCandidate(availableSeats, count);
        if (exact != null) {
            return toSeatSuggestion(count, true, "Đã tìm thấy " + count + " ghế liền nhau cùng hàng.", exact.seats());
        }

        Candidate nearest = findNearestCandidate(availableSeats, count);
        return toSeatSuggestion(count, false, "Không có đủ " + count + " ghế liền nhau. Đây là cụm ghế gần nhau nhất.", nearest.seats());
    }

    private Candidate findExactAdjacentCandidate(List<ShowtimeSeatResponse> seats, int count) {
        return seatsByRow(seats).values().stream()
                .map(rowSeats -> bestWindow(rowSeats, count, true))
                .filter(Objects::nonNull)
                .min(Comparator.comparingInt(Candidate::score))
                .orElse(null);
    }

    private Candidate findNearestCandidate(List<ShowtimeSeatResponse> seats, int count) {
        Candidate sameRow = seatsByRow(seats).values().stream()
                .map(rowSeats -> bestWindow(rowSeats, count, false))
                .filter(Objects::nonNull)
                .min(Comparator.comparingInt(Candidate::score))
                .orElse(null);
        if (sameRow != null) return sameRow;

        List<ShowtimeSeatResponse> selected = new ArrayList<>();
        List<List<ShowtimeSeatResponse>> rows = new ArrayList<>(seatsByRow(seats).values());
        rows.sort(Comparator.<List<ShowtimeSeatResponse>, String>comparing(row -> row.get(0).getRowName())
                .thenComparing(row -> row.get(0).getSeatNumber()));
        rows.sort(Comparator.comparingInt(List<ShowtimeSeatResponse>::size).reversed());
        for (List<ShowtimeSeatResponse> row : rows) {
            for (ShowtimeSeatResponse seat : row) {
                selected.add(seat);
                if (selected.size() == count) return new Candidate(selected, 10_000);
            }
        }
        return new Candidate(selected, 20_000);
    }

    private Candidate bestWindow(List<ShowtimeSeatResponse> rowSeats, int count, boolean requireAdjacent) {
        if (rowSeats.size() < count) return null;
        Candidate best = null;
        for (int start = 0; start <= rowSeats.size() - count; start++) {
            List<ShowtimeSeatResponse> window = rowSeats.subList(start, start + count);
            int span = window.get(window.size() - 1).getSeatNumber() - window.get(0).getSeatNumber();
            if (requireAdjacent && span != count - 1) continue;
            int gaps = span - (count - 1);
            int centerPenalty = Math.abs(window.get(0).getSeatNumber() + window.get(window.size() - 1).getSeatNumber());
            Candidate candidate = new Candidate(List.copyOf(window), span * 100 + gaps * 1_000 + centerPenalty);
            if (best == null || candidate.score() < best.score()) best = candidate;
        }
        return best;
    }

    private Map<String, List<ShowtimeSeatResponse>> seatsByRow(List<ShowtimeSeatResponse> seats) {
        Map<String, List<ShowtimeSeatResponse>> byRow = new TreeMap<>();
        for (ShowtimeSeatResponse seat : seats) {
            byRow.computeIfAbsent(seat.getRowName(), ignored -> new ArrayList<>()).add(seat);
        }
        byRow.values().forEach(rowSeats -> rowSeats.sort(Comparator.comparing(ShowtimeSeatResponse::getSeatNumber)));
        return byRow;
    }

    private SeatSuggestionResponse toSeatSuggestion(int count, boolean exactMatch, String message, List<ShowtimeSeatResponse> seats) {
        return SeatSuggestionResponse.builder()
                .requestedCount(count)
                .exactMatch(exactMatch)
                .message(message)
                .seatIds(seats.stream().map(ShowtimeSeatResponse::getSeatId).toList())
                .seats(seats)
                .build();
    }

    private record Candidate(List<ShowtimeSeatResponse> seats, int score) {}

    @Transactional
    public BookingResponse createBooking(UUID userId, CreateBookingRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new BadRequestException("User not found");
        }

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Showtime not found"));

        if (showtime.getStartTime().isBefore(now())) {
            throw new BadRequestException("Cannot book a past showtime");
        }

        List<SeatAvailability> availabilities = new ArrayList<>();
        List<Seat> seats = new ArrayList<>();
        BigDecimal seatTotal = BigDecimal.ZERO;

        for (UUID seatId : request.getSeatIds()) {
            SeatAvailability av = seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(request.getShowtimeId(), seatId)
                    .orElseThrow(() -> new BadRequestException("Seat not found in this showtime: " + seatId));

            if (av.getStatus() != SeatBookingStatus.AVAILABLE) {
                Seat seat = seatRepository.findById(seatId).orElse(null);
                String seatInfo = seat != null ? seat.getRowName() + seat.getSeatNumber() : seatId.toString();
                throw new BadRequestException("Seat is already taken: " + seatInfo);
            }

            availabilities.add(av);
            Seat seat = seatRepository.findById(seatId).orElse(null);
            if (seat != null) {
                seats.add(seat);
            }
            seatTotal = seatTotal.add(av.getPrice());
        }

        BigDecimal comboTotal = BigDecimal.ZERO;
        if (request.getComboIds() != null && !request.getComboIds().isEmpty()) {
            List<ComboResponse> combos = comboService.getCombos(request.getComboIds());
            for (ComboResponse combo : combos) {
                comboTotal = comboTotal.add(combo.getPrice());
            }
        }

        BigDecimal total = seatTotal.add(comboTotal);
        if (!"ONLINE".equalsIgnoreCase(request.getChannel()) && !"OFFLINE".equalsIgnoreCase(request.getChannel())) {
            throw new BadRequestException("Invalid booking channel: " + request.getChannel());
        }

        for (SeatAvailability av : availabilities) {
            av.setStatus(SeatBookingStatus.HOLDING);
        }
        seatAvailabilityRepository.saveAll(availabilities);

        Booking booking = Booking.builder()
                .userId(userId)
                .showtimeId(request.getShowtimeId())
                .totalAmount(total)
                .status(BookingStatus.HOLD)
                .confirmationCode(generateConfirmationCode())
                .holdExpiresAt(now().plusMinutes(HOLD_MINUTES))
                .build();

        booking = bookingRepository.save(booking);

        for (int i = 0; i < seats.size(); i++) {
            BookingSeat bs = BookingSeat.builder()
                    .bookingId(booking.getId())
                    .seatId(seats.get(i).getId())
                    .priceAtBooking(availabilities.get(i).getPrice())
                    .build();
            bookingSeatRepository.save(bs);
        }

        return toBookingResponse(booking, seats);
    }

    @Transactional
    public BookingPaymentResponse payBooking(UUID bookingId, UUID userId, PayBookingRequest request) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        // A client can legitimately retry when the first response is lost or times out.
        // Return the completed payment instead of turning that retry into a false failure.
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            Payment existingPayment = paymentRepository.findByBookingId(bookingId)
                    .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                    .orElse(null);
            if (existingPayment != null) {
                List<TicketResponse> existingTickets = ticketRepository.findByBookingId(bookingId).stream()
                        .map(TicketResponse::fromTicket)
                        .toList();
                BigDecimal originalAmount = booking.getTotalAmount();
                BigDecimal discountAmount = originalAmount.subtract(existingPayment.getAmount()).max(BigDecimal.ZERO);
                return BookingPaymentResponse.fromPaymentResult(
                        booking, existingPayment, existingTickets, originalAmount, discountAmount, null);
            }
        }

        if (booking.getStatus() == BookingStatus.HOLD) {
            if (booking.getHoldExpiresAt().isBefore(now())) {
                releaseSeats(booking);
                booking.setStatus(BookingStatus.EXPIRED);
                bookingRepository.save(booking);
                throw new BadRequestException("Booking hold has expired");
            }
            Payment pendingPayment = paymentRepository.findByBookingId(bookingId)
                    .filter(payment -> payment.getStatus() == PaymentStatus.PENDING
                            && payment.getCheckoutUrl() != null
                            && !payment.getCheckoutUrl().isBlank())
                    .orElse(null);
            if (pendingPayment != null) {
                BigDecimal discountAmount = booking.getTotalAmount().subtract(pendingPayment.getAmount()).max(BigDecimal.ZERO);
                return BookingPaymentResponse.fromPaymentResult(
                        booking, pendingPayment, List.of(), booking.getTotalAmount(), discountAmount, null);
            }
        }

        if (booking.getStatus() != BookingStatus.HOLD) {
            throw new BadRequestException("Booking is not in HOLD status");
        }
        BigDecimal originalAmount = booking.getTotalAmount();
        BigDecimal discountAmount = BigDecimal.ZERO;
        String discountCode = null;

        if (request.getDiscountCode() != null && !request.getDiscountCode().isBlank()) {
            List<BookingSeat> bsForDiscount = bookingSeatRepository.findByBookingId(bookingId);
            List<String> seatTypes = bsForDiscount.stream()
                    .map(bs -> seatRepository.findById(bs.getSeatId()).orElse(null))
                    .filter(s -> s != null)
                    .map(s -> s.getType().toStorageValue())
                    .distinct()
                    .toList();
            discountAmount = discountService.calculateDiscount(request.getDiscountCode(), originalAmount, userId, seatTypes);
            discountCode = request.getDiscountCode();
        }

        BigDecimal finalAmount = originalAmount.subtract(discountAmount);

        String paymentMethod = request.getPaymentMethod().trim().toUpperCase();
        Payment payment = Payment.builder()
                .bookingId(booking.getId())
                .amount(finalAmount)
                .paymentMethod(paymentMethod)
                .provider(resolveProvider(paymentMethod))
                .status(isExternalProvider(paymentMethod) ? PaymentStatus.PENDING : PaymentStatus.PAID)
                .transactionId(UUID.randomUUID().toString())
                .paidAt(isExternalProvider(paymentMethod) ? null : now())
                .build();
        payment = paymentRepository.save(payment);

        if (isExternalProvider(paymentMethod)) {
            PaymentGatewayService.GatewayPayment gatewayPayment = paymentGatewayService.createGatewayPayment(
                    paymentMethod,
                    payment,
                    "ThauFilm " + booking.getConfirmationCode()
            );
            payment.setProvider(gatewayPayment.provider());
            payment.setProviderCheckoutId(gatewayPayment.checkoutId());
            payment.setProviderPaymentId(gatewayPayment.paymentId());
            payment.setCheckoutUrl(gatewayPayment.checkoutUrl());
            payment.setQrCode(gatewayPayment.qrCode());
            payment.setTransactionId(gatewayPayment.checkoutId());
            payment = paymentRepository.save(payment);
            return BookingPaymentResponse.fromPaymentResult(booking, payment, List.of(), originalAmount, discountAmount, discountCode);
        }

        return confirmPaidBooking(booking, payment, originalAmount, discountAmount, discountCode);
    }

    @Transactional
    public void confirmPayosPayment(String orderCode, String paymentId) {
        Payment payment = paymentRepository.findByProviderCheckoutId(orderCode)
                .orElseGet(() -> paymentRepository.findByProviderPaymentId(paymentId)
                        .orElseThrow(() -> new BadRequestException("Payment not found for PayOS order")));
        payment.setProviderPaymentId(paymentId);
        payment.setTransactionId(orderCode);
        confirmExternalPayment(payment);
    }

    private void confirmExternalPayment(Payment payment) {
        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }
        Booking booking = bookingRepository.findById(payment.getBookingId())
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        if (booking.getStatus() != BookingStatus.HOLD) {
            throw new BadRequestException("Booking is not in HOLD status");
        }
        BigDecimal originalAmount = booking.getTotalAmount();
        BigDecimal discountAmount = originalAmount.subtract(payment.getAmount()).max(BigDecimal.ZERO);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(now());
        paymentRepository.save(payment);
        confirmPaidBooking(booking, payment, originalAmount, discountAmount, null);
    }

    private BookingPaymentResponse confirmPaidBooking(Booking booking, Payment payment,
                                                       BigDecimal originalAmount, BigDecimal discountAmount,
                                                       String discountCode) {

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(now());
        booking = bookingRepository.save(booking);

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        User user = userRepository.findById(booking.getUserId()).orElse(null);

        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        if (tickets.isEmpty()) {
            tickets = new ArrayList<>();
            for (BookingSeat bs : bookingSeats) {
                Ticket ticket = Ticket.builder()
                        .bookingId(booking.getId())
                        .seatId(bs.getSeatId())
                        .ticketCode(generateTicketCode())
                        .checkedIn(false)
                        .build();
                tickets.add(ticketRepository.save(ticket));
            }
        }

        List<TicketResponse> ticketResponses = tickets.stream()
                .map(TicketResponse::fromTicket)
                .toList();

        BookingPaymentResponse response = BookingPaymentResponse.fromPaymentResult(
                booking, payment, ticketResponses, originalAmount, discountAmount, discountCode);

        realtimeEventService.notifyUser(booking.getUserId(), "BOOKING_CONFIRMED", "Đặt vé thành công",
                "Vé " + booking.getConfirmationCode() + " đã được xác nhận", "/my-bookings/" + booking.getId());

        if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
            eventPublisher.publishEvent(new BookingConfirmedEvent(booking.getId(), discountAmount, payment.getAmount()));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(UUID userId) {
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return bookings.stream()
                .map(this::toBookingResponseWithoutSeats)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingDetail(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        return toBookingResponseWithoutSeats(booking);
    }

    @Transactional
    public TicketResponse checkIn(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));

        if (ticket.isCheckedIn()) {
            throw new BadRequestException("Ticket already checked in");
        }

        Booking booking = bookingRepository.findById(ticket.getBookingId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking is not confirmed");
        }

        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(now());
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

    @Transactional
    public void expireBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() == BookingStatus.HOLD) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
        }
    }

    @Transactional
    public void cancelBooking(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() == BookingStatus.HOLD) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
        } else {
            throw new BadRequestException("Cannot cancel booking with status: " + booking.getStatus());
        }
    }

    @Transactional
    public void releaseSeats(Booking booking) {
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat bs : bookingSeats) {
            SeatAvailability av = seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(booking.getShowtimeId(), bs.getSeatId())
                    .orElse(null);
            if (av != null) {
                av.setStatus(SeatBookingStatus.AVAILABLE);
                seatAvailabilityRepository.save(av);
            }
        }
    }

    private void sendTicketEmail(String to, Booking booking, List<Ticket> tickets, Payment payment,
                                 BigDecimal discountAmount, BigDecimal finalAmount) throws Exception {
        String subject = "Ve xem phim";
        String movieTitle = "Phim";

        Showtime s = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (s != null) {
            Movie m = movieRepository.findById(s.getMovieId()).orElse(null);
            if (m != null) {
                subject = "Ve xem phim - " + m.getTitle();
                movieTitle = m.getTitle();
            }
        }

        String html = buildHtmlBody(booking, tickets, payment, discountAmount, finalAmount, movieTitle);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        if (mailFrom != null && !mailFrom.isBlank()) {
            helper.setFrom(mailFrom);
        }
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);

        byte[] pdfBytes = ticketPdfGenerator.generateTicketPdf(booking, tickets);
        helper.addAttachment("ticket.pdf", new ByteArrayResource(pdfBytes));

        mailSender.send(message);
        log.info("Ticket email sent to {} for booking {}", to, booking.getId());
    }

    /**
     * Sends the same ticket email used by the individual booking flow for a
     * booking that was confirmed by another flow (for example group booking).
     */
    public void sendConfirmedBookingEmail(Booking booking) {
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) return;

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()
                || payment == null || tickets.isEmpty()) {
            log.warn("Skip ticket email for booking {} because user, payment, email or ticket is missing", booking.getId());
            return;
        }

        try {
            sendTicketEmail(user.getEmail(), booking, tickets, payment, BigDecimal.ZERO, payment.getAmount());
        } catch (Exception ex) {
            // Payment and ticket issuance must remain successful if SMTP is temporarily unavailable.
            log.error("Failed to send group ticket email for booking {}", booking.getId(), ex);
        }
    }

    @Transactional(readOnly = true)
    public void sendConfirmedBookingEmail(UUID bookingId, BigDecimal discountAmount, BigDecimal finalAmount) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) return;

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        Payment payment = paymentRepository.findByBookingId(bookingId).orElse(null);
        List<Ticket> tickets = ticketRepository.findByBookingId(bookingId);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()
                || payment == null || tickets.isEmpty()) {
            log.warn("Skip ticket email for booking {} because user, payment, email or ticket is missing", bookingId);
            return;
        }

        try {
            sendTicketEmail(user.getEmail(), booking, tickets, payment, discountAmount, finalAmount);
        } catch (Exception ex) {
            log.error("Failed to send ticket email for booking {}", bookingId, ex);
        }
    }

    private String buildHtmlBody(Booking booking, List<Ticket> tickets, Payment payment,
                                 BigDecimal discountAmount, BigDecimal finalAmount, String movieTitle) {
        String cinema = "Rap";
        String showtime = "";
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        Map<UUID, BigDecimal> seatPriceById = new HashMap<>();
        BigDecimal seatTotal = BigDecimal.ZERO;
        for (BookingSeat bookingSeat : bookingSeats) {
            BigDecimal price = bookingSeat.getPriceAtBooking() != null ? bookingSeat.getPriceAtBooking() : BigDecimal.ZERO;
            seatPriceById.put(bookingSeat.getSeatId(), price);
            seatTotal = seatTotal.add(price);
        }
        BigDecimal comboTotal = booking.getTotalAmount().subtract(seatTotal).max(BigDecimal.ZERO);

        Showtime s = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (s != null) {
            CinemaRoom room = cinemaRoomRepository.findById(s.getCinemaRoomId()).orElse(null);
            if (room != null) {
                cinema = room.getName();
            }
            showtime = s.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        }

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        String userName = user != null ? user.getFullName() : "";

        StringBuilder ticketListHtml = new StringBuilder();
        for (Ticket ticket : tickets) {
            Seat seat = seatRepository.findById(ticket.getSeatId()).orElse(null);
            String seatLabel = seat != null ? seat.getRowName() + seat.getSeatNumber() : ticket.getSeatId().toString();
            String seatType = seat != null ? switch (seat.getType()) {
                case VIP -> "VIP";
                case COUPLE -> "Doi";
                case STANDARD -> "Thuong";
            } : "Khong ro";
            BigDecimal seatPrice = seatPriceById.getOrDefault(ticket.getSeatId(), BigDecimal.ZERO);
            ticketListHtml.append("<li>")
                    .append(escape(ticket.getTicketCode()))
                    .append(" - Ghe ").append(escape(seatLabel))
                    .append(" - Loai ").append(escape(seatType))
                    .append(" - Gia ").append(formatMoney(seatPrice)).append(" VND")
                    .append("</li>");
        }

        StringBuilder builder = new StringBuilder();
        builder.append("<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#222;max-width:640px;margin:auto'>");
        builder.append("<h2 style='color:#111;margin-bottom:8px'>").append(escape(movieTitle)).append("</h2>");
        builder.append("<p style='color:#555'>").append(escape(userName)).append(",</p>");
        builder.append("<p>Cam on quy khach da mua ve. Thong tin ve:</p>");
        builder.append("<table style='width:100%;border-collapse:collapse;margin:10px 0 16px'>");
        builder.append("<tr><td style='padding:6px 8px;color:#666;width:120px'>Rap</td><td style='padding:6px 8px'>").append(escape(cinema)).append("</td></tr>");
        builder.append("<tr><td style='padding:6px 8px;color:#666'>Gio chieu</td><td style='padding:6px 8px'>").append(escape(showtime)).append("</td></tr>");
        builder.append("<tr><td style='padding:6px 8px;color:#666'>Ma dat ve</td><td style='padding:6px 8px'>").append(escape(booking.getConfirmationCode())).append("</td></tr>");
        builder.append("</table>");
        builder.append("<p>Danh sach ve:</p><ul>").append(ticketListHtml).append("</ul>");
        builder.append("<p>Tien ghe: <b>").append(formatMoney(seatTotal)).append(" VND</b></p>");
        if (comboTotal.compareTo(BigDecimal.ZERO) > 0) {
            builder.append("<p>Combo bap nuoc: <b>").append(formatMoney(comboTotal)).append(" VND</b></p>");
        }
        builder.append("<p>Tong tien truoc giam: <b>").append(formatMoney(booking.getTotalAmount())).append(" VND</b></p>");
        if (discountAmount.compareTo(BigDecimal.ZERO) > 0) {
            builder.append("<p>Giam gia: <b>-").append(formatMoney(discountAmount)).append(" VND</b></p>");
        }
        builder.append("<p>Thanh toan: <b>").append(formatMoney(finalAmount)).append(" VND</b></p>");
        builder.append("<p>Phuong thuc: ").append(escape(payment.getPaymentMethod())).append("</p>");
        builder.append("<p>Ma giao dich: ").append(escape(payment.getTransactionId())).append("</p>");
        builder.append("<p style='margin-top:18px;color:#444'>File dinh kem la PDF ve dien tu. Vui long xuat trinh ma ve khi den rap.</p>");
        builder.append("<p>Chuc quy khach xem phim vui ve!</p>");
        builder.append("</body></html>");
        return builder.toString();
    }

    private BookingResponse toBookingResponse(Booking booking, List<Seat> seats) {
        List<ShowtimeSeatResponse> seatResponses = new ArrayList<>();
        for (Seat seat : seats) {
            seatResponses.add(ShowtimeSeatResponse.builder()
                    .seatId(seat.getId())
                    .rowName(seat.getRowName())
                    .seatNumber(seat.getSeatNumber())
                    .type(seat.getType().toStorageValue())
                    .status(SeatBookingStatus.SOLD)
                    .price(BigDecimal.ZERO)
                    .build());
        }

        String movieTitle = null;
        String cinemaRoomName = null;
        if (booking.getShowtimeId() != null) {
            var optShowtime = showtimeRepository.findById(booking.getShowtimeId());
            if (optShowtime.isPresent()) {
                Showtime showtime = optShowtime.get();
                movieTitle = movieRepository.findById(showtime.getMovieId())
                        .map(Movie::getTitle).orElse(null);
                cinemaRoomName = cinemaRoomRepository.findById(showtime.getCinemaRoomId())
                        .map(CinemaRoom::getName).orElse(null);
            }
        }

        return BookingResponse.fromBooking(booking, seatResponses, movieTitle, cinemaRoomName);
    }

    private BookingResponse toBookingResponseWithoutSeats(Booking booking) {
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        List<ShowtimeSeatResponse> seatResponses = new ArrayList<>();

        for (BookingSeat bs : bookingSeats) {
            Seat seat = seatRepository.findById(bs.getSeatId()).orElse(null);
            if (seat != null) {
                seatResponses.add(ShowtimeSeatResponse.builder()
                        .seatId(seat.getId())
                        .rowName(seat.getRowName())
                        .seatNumber(seat.getSeatNumber())
                        .type(seat.getType().toStorageValue())
                        .status(SeatBookingStatus.SOLD)
                        .price(bs.getPriceAtBooking())
                        .build());
            }
        }

        String movieTitle = null;
        String cinemaRoomName = null;
        if (booking.getShowtimeId() != null) {
            var optShowtime = showtimeRepository.findById(booking.getShowtimeId());
            if (optShowtime.isPresent()) {
                Showtime showtime = optShowtime.get();
                movieTitle = movieRepository.findById(showtime.getMovieId())
                        .map(Movie::getTitle).orElse(null);
                cinemaRoomName = cinemaRoomRepository.findById(showtime.getCinemaRoomId())
                        .map(CinemaRoom::getName).orElse(null);
            }
        }

        return BookingResponse.fromBooking(booking, seatResponses, movieTitle, cinemaRoomName);
    }

    private String formatMoney(BigDecimal value) {
        BigDecimal rounded = value.setScale(0, RoundingMode.HALF_UP);
        NumberFormat format = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        format.setMaximumFractionDigits(0);
        format.setMinimumFractionDigits(0);
        String formatted = format.format(rounded);
        return formatted.replace("₫", "").trim();
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String generateConfirmationCode() {
        return "BK" + String.format("%06d", new Random().nextInt(999999));
    }

    private boolean isExternalProvider(String paymentMethod) {
        String normalized = String.valueOf(paymentMethod).trim().toUpperCase(Locale.ROOT);
        return "PAYOS".equals(normalized) || "VIETQR".equals(normalized);
    }

    private String resolveProvider(String paymentMethod) {
        String normalized = String.valueOf(paymentMethod).trim().toUpperCase(Locale.ROOT);
        if ("PAYOS".equals(normalized) || "VIETQR".equals(normalized)) return "PAYOS";
        return "MOCK";
    }

    private String generateTicketCode() {
        return "TK" + String.format("%06d", new Random().nextInt(999999));
    }
}
