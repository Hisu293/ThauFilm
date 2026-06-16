package com.filmticket.service;

import com.filmticket.dto.*;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.util.TicketPdfGenerator;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private final BookingRepository bookingRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final ComboService comboService;
    private final DiscountService discountService;
    private final JavaMailSender mailSender;

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
        BigDecimal seatTotal = BigDecimal.ZERO;

        for (UUID seatId : request.getSeatIds()) {
            SeatAvailability av = seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(request.getShowtimeId(), seatId)
                    .orElseThrow(() -> new BadRequestException("Seat not found in this showtime: " + seatId));

            if (!av.isAvailable()) {
                throw new BadRequestException("Seat is already taken: " + av.getSeat().getRowName() + av.getSeat().getSeatNumber());
            }
            availabilities.add(av);
            seats.add(av.getSeat());
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
        if ("ONLINE".equalsIgnoreCase(request.getChannel())) {
            total = seatTotal.add(comboTotal);
        } else if ("OFFLINE".equalsIgnoreCase(request.getChannel())) {
            total = seatTotal.add(comboTotal);
        } else {
            throw new BadRequestException("Invalid booking channel: " + request.getChannel());
        }

        for (SeatAvailability av : availabilities) {
            av.setAvailable(false);
        }
        seatAvailabilityRepository.saveAll(availabilities);

        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .totalAmount(total)
                .status(BookingStatus.PENDING)
                .confirmationCode(generateConfirmationCode())
                .holdExpiresAt(LocalDateTime.now().plusMinutes(HOLD_MINUTES))
                .build();

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

        BigDecimal originalAmount = booking.getTotalAmount();
        BigDecimal discountAmount = BigDecimal.ZERO;
        String discountCode = null;

        if (request.getDiscountCode() != null && !request.getDiscountCode().isBlank()) {
            discountAmount = discountService.calculateDiscount(request.getDiscountCode(), originalAmount, userId);
            discountCode = request.getDiscountCode();
        }

        BigDecimal finalAmount = originalAmount.subtract(discountAmount);

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(finalAmount)
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.PAID)
                .transactionId(UUID.randomUUID().toString())
                .paidAt(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);

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

        BookingPaymentResponse response = BookingPaymentResponse.fromPaymentResult(
                booking, payment, ticketResponses, originalAmount, discountAmount, discountCode);

        try {
            sendTicketEmail(booking.getUser().getEmail(), booking, tickets, payment, discountAmount, finalAmount);
        } catch (Exception ex) {
            log.error("Failed to send ticket email for booking {}", booking.getId(), ex);
        }

        return response;
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

    private void sendTicketEmail(String to, Booking booking, List<Ticket> tickets, Payment payment,
                                 BigDecimal discountAmount, BigDecimal finalAmount) throws Exception {
        String subject = "Ve xem phim - " + booking.getShowtime().getMovie().getTitle();
        String html = buildHtmlBody(booking, tickets, payment, discountAmount, finalAmount);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);

        byte[] pdfBytes = TicketPdfGenerator.generateTicketPdf(booking, tickets);
        helper.addAttachment("ticket.pdf", new ByteArrayResource(pdfBytes));

        mailSender.send(message);
    }

    private String buildHtmlBody(Booking booking, List<Ticket> tickets, Payment payment,
                                 BigDecimal discountAmount, BigDecimal finalAmount) {
        String movieTitle = booking.getShowtime().getMovie().getTitle();
        String cinema = booking.getShowtime().getCinemaRoom().getName();
        String showtime = booking.getShowtime().getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String confirmationCode = booking.getConfirmationCode();

        StringBuilder ticketListHtml = new StringBuilder();
        for (Ticket ticket : tickets) {
            ticketListHtml.append("<li>").append(ticket.getTicketCode()).append("</li>");
        }

        StringBuilder builder = new StringBuilder();
        builder.append("<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#222;max-width:640px;margin:auto'>");
        builder.append("<h2 style='color:#111;margin-bottom:8px'>").append(escape(movieTitle)).append("</h2>");
        builder.append("<p style='color:#555'>").append(escape(booking.getUser().getFullName())).append(",</p>");
        builder.append("<p>Cam on quy khach da mua ve. Thong tin ve:</p>");
        builder.append("<table style='width:100%;border-collapse:collapse;margin:10px 0 16px'>");
        builder.append("<tr><td style='padding:6px 8px;color:#666;width:120px'>Rap</td><td style='padding:6px 8px'>").append(escape(cinema)).append("</td></tr>");
        builder.append("<tr><td style='padding:6px 8px;color:#666'>Gio chieu</td><td style='padding:6px 8px'>").append(escape(showtime)).append("</td></tr>");
        builder.append("<tr><td style='padding:6px 8px;color:#666'>Ma dat ve</td><td style='padding:6px 8px'>").append(escape(confirmationCode)).append("</td></tr>");
        builder.append("</table>");
        builder.append("<p>Danh sach ve:</p><ul>").append(ticketListHtml).append("</ul>");
        builder.append("<p>Tong tien: <b>").append(formatMoney(booking.getTotalAmount())).append(" VND</b></p>");
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

    private BookingResponse toBookingResponse(Booking booking) {
        List<ShowtimeSeatResponse> seats = booking.getBookingSeats().stream()
                .map(bs -> ShowtimeSeatResponse.builder()
                        .seatId(bs.getSeat().getId())
                        .rowName(bs.getSeat().getRowName())
                        .seatNumber(bs.getSeat().getSeatNumber())
                        .type(bs.getSeat().getType().toStorageValue())
                        .available(false)
                        .price(bs.getPriceAtBooking())
                        .build())
                .collect(Collectors.toList());
        return BookingResponse.fromBooking(booking, seats);
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

    private String generateTicketCode() {
        return "TK" + String.format("%06d", new Random().nextInt(999999));
    }
}
