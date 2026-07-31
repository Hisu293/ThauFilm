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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final BigDecimal ONLINE_MOVIE_PRICE = BigDecimal.valueOf(79000);
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
    private final OutboundEmailService outboundEmailService;
    private final TicketPdfGenerator ticketPdfGenerator;
    private final RealtimeEventService realtimeEventService;
    private final ApplicationEventPublisher eventPublisher;
    private final PaymentGatewayService paymentGatewayService;
    private final LoyaltyService loyaltyService;
    private final BookingComboItemRepository bookingComboItemRepository;
    private final ShowtimeService showtimeService;
    private final AuditLogService auditLogService;

    private static final int HOLD_MINUTES = 10;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private LocalDateTime now() {
        return LocalDateTime.now(VIETNAM_ZONE);
    }

    // ĐÃ SỬA: Thêm UUID currentUserId
    @Transactional
    public List<ShowtimeSeatResponse> getAvailableSeats(UUID showtimeId, UUID currentUserId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu"));

        List<SeatAvailability> availabilities = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        if (availabilities.isEmpty() && !showtime.isOnline()) {
            showtimeService.ensureSeatAvailabilities(showtimeId);
            availabilities = seatAvailabilityRepository.findByShowtimeIdOrderBySeatId(showtimeId);
        }
        List<UUID> seatIds = availabilities.stream().map(SeatAvailability::getSeatId).toList();

        Map<UUID, Seat> seatById = seatRepository.findAllById(seatIds)
                .stream()
                .collect(Collectors.toMap(Seat::getId, seat -> seat));

        // Lấy danh sách ID ghế mà user hiện tại đang giữ chỗ (nếu đã đăng nhập)
        Set<UUID> myHeldSeatIds = new HashSet<>();
        if (currentUserId != null) {
            myHeldSeatIds.addAll(bookingSeatRepository.findActiveHeldSeatIds(
                    currentUserId,
                    showtimeId,
                    BookingStatus.HOLD,
                    now()
            ));
        }

        return availabilities.stream()
                .map(availability -> {
                    Seat seat = seatById.get(availability.getSeatId());
                    ShowtimeSeatResponse response = ShowtimeSeatResponse.fromSeatAvailability(availability, seat);

                    // Nếu ghế đang HOLDING và nằm trong danh sách của user -> Bật cờ
                    if (availability.getStatus() == SeatBookingStatus.HOLDING && myHeldSeatIds.contains(availability.getSeatId())) {
                        response.setHeldByMe(true);
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
    public SeatSuggestionResponse suggestSeats(UUID showtimeId, UUID currentUserId, int count) {
        if (count < 1 || count > 8) {
            throw new BadRequestException("Số ghế cần tìm phải từ 1 đến 8");
        }
        List<ShowtimeSeatResponse> availableSeats = getAvailableSeats(showtimeId, currentUserId).stream()
                .filter(seat -> seat.getStatus() == SeatBookingStatus.AVAILABLE || seat.isHeldByMe())
                .filter(seat -> seat.getRowName() != null && seat.getSeatNumber() != null)
                .sorted(Comparator.comparing(ShowtimeSeatResponse::getRowName)
                        .thenComparing(ShowtimeSeatResponse::getSeatNumber))
                .toList();
        int availableCapacity = availableSeats.stream().mapToInt(this::seatCapacity).sum();
        if (availableCapacity < count) {
            throw new BadRequestException("Không còn đủ " + count + " ghế trống cho suất chiếu này");
        }

        List<RankedRowCandidate> rowCandidates = seatsByRow(availableSeats).entrySet().stream()
                .map(entry -> {
                    Candidate candidate = bestWindow(entry.getValue(), count, false);
                    if (candidate == null) return null;
                    int span = candidate.seats().get(candidate.seats().size() - 1).getSeatNumber()
                            - candidate.seats().get(0).getSeatNumber();
                    return new RankedRowCandidate(entry.getKey(), candidate, span == candidate.seats().size() - 1);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(RankedRowCandidate::exactMatch).reversed()
                        .thenComparingInt(candidate -> candidate.candidate().score()))
                .toList();

        if (rowCandidates.isEmpty()) {
            throw new BadRequestException("Không có hàng ghế nào còn đủ " + count + " chỗ phù hợp");
        }

        List<SeatSuggestionOptionResponse> options = rowCandidates.stream()
                .map(candidate -> toSeatSuggestionOption(
                        candidate.rowName(),
                        candidate.exactMatch(),
                        candidate.candidate().seats(),
                        candidate.candidate().capacity()
                ))
                .toList();
        SeatSuggestionOptionResponse recommended = options.get(0);

        return SeatSuggestionResponse.builder()
                .requestedCount(count)
                .exactMatch(recommended.isExactMatch())
                .message("Có " + options.size() + " hàng ghế phù hợp. Hãy chọn một hàng để xác nhận giữ ghế.")
                .seatIds(recommended.getSeatIds())
                .seats(recommended.getSeats())
                .options(options)
                .build();
    }

    private Candidate bestWindow(List<ShowtimeSeatResponse> rowSeats, int count, boolean requireAdjacent) {
        if (rowSeats.isEmpty()) return null;
        Candidate best = null;
        int rowCenter = rowSeats.get(0).getSeatNumber() + rowSeats.get(rowSeats.size() - 1).getSeatNumber();
        for (int start = 0; start < rowSeats.size(); start++) {
            int capacity = 0;
            for (int end = start; end < rowSeats.size(); end++) {
                capacity += seatCapacity(rowSeats.get(end));
                if (capacity > count) break;
                if (capacity < count) continue;
                List<ShowtimeSeatResponse> window = List.copyOf(rowSeats.subList(start, end + 1));
                int span = window.get(window.size() - 1).getSeatNumber() - window.get(0).getSeatNumber();
                if (requireAdjacent && span != window.size() - 1) continue;
                int gaps = span - (window.size() - 1);
                int candidateCenter = window.get(0).getSeatNumber() + window.get(window.size() - 1).getSeatNumber();
                int centerPenalty = Math.abs(candidateCenter - rowCenter);
                Candidate candidate = new Candidate(window, capacity, span * 100 + gaps * 1_000 + centerPenalty);
                if (best == null || candidate.score() < best.score()) best = candidate;
            }
        }
        return best;
    }

    private int seatCapacity(ShowtimeSeatResponse seat) {
        return "COUPLE".equalsIgnoreCase(seat.getType()) ? 2 : 1;
    }

    private Map<String, List<ShowtimeSeatResponse>> seatsByRow(List<ShowtimeSeatResponse> seats) {
        Map<String, List<ShowtimeSeatResponse>> byRow = new TreeMap<>();
        for (ShowtimeSeatResponse seat : seats) {
            byRow.computeIfAbsent(seat.getRowName(), ignored -> new ArrayList<>()).add(seat);
        }
        byRow.values().forEach(rowSeats -> rowSeats.sort(Comparator.comparing(ShowtimeSeatResponse::getSeatNumber)));
        return byRow;
    }

    private SeatSuggestionOptionResponse toSeatSuggestionOption(
            String rowName,
            boolean exactMatch,
            List<ShowtimeSeatResponse> seats,
            int seatCapacity
    ) {
        return SeatSuggestionOptionResponse.builder()
                .rowName(rowName)
                .exactMatch(exactMatch)
                .seatCapacity(seatCapacity)
                .seatIds(seats.stream().map(ShowtimeSeatResponse::getSeatId).toList())
                .seats(seats)
                .build();
    }

    private record Candidate(List<ShowtimeSeatResponse> seats, int capacity, int score) {}
    private record RankedRowCandidate(String rowName, Candidate candidate, boolean exactMatch) {}

    @Transactional
    public BookingResponse createBooking(UUID userId, CreateBookingRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new BadRequestException("Không tìm thấy người dùng");
        }

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu"));

        if (showtime.getStartTime().isBefore(now())) {
            throw new BadRequestException("Không thể đặt vé cho suất chiếu đã qua");
        }

        List<UUID> requestedSeatIds = normalizeSeatIds(request.getSeatIds());
        List<SeatAvailability> availabilities = lockAvailableSeats(request.getShowtimeId(), requestedSeatIds);
        List<Seat> seats = loadSeatsInOrder(requestedSeatIds);
        BigDecimal seatTotal = availabilities.stream()
                .map(SeatAvailability::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal comboTotal = BigDecimal.ZERO;
        if (request.getComboIds() != null && !request.getComboIds().isEmpty()) {
            List<ComboResponse> combos = comboService.getCombos(request.getComboIds());
            for (ComboResponse combo : combos) {
                comboTotal = comboTotal.add(combo.getPrice());
            }
        }

        BigDecimal total = seatTotal.add(comboTotal);
        if (!"ONLINE".equalsIgnoreCase(request.getChannel()) && !"OFFLINE".equalsIgnoreCase(request.getChannel())) {
            throw new BadRequestException("Kênh đặt vé không hợp lệ: " + request.getChannel());
        }

        Booking booking = Booking.builder()
                .userId(userId)
                .showtimeId(request.getShowtimeId())
                .totalAmount(total)
                .status(BookingStatus.HOLD)
                .confirmationCode(generateConfirmationCode())
                .holdExpiresAt(now().plusMinutes(HOLD_MINUTES))
                .build();

        booking = bookingRepository.save(booking);
        replaceBookingCombos(booking.getId(), request.getComboIds());

        for (int i = 0; i < seats.size(); i++) {
            BookingSeat bs = BookingSeat.builder()
                    .bookingId(booking.getId())
                    .seatId(seats.get(i).getId())
                    .priceAtBooking(availabilities.get(i).getPrice())
                    .build();
            bookingSeatRepository.save(bs);
        }

        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.CINEMA_BOOKING_CREATED).targetType("BOOKING")
                .targetId(booking.getId().toString())
                .description("Đã tạo đơn đặt vé tại rạp")
                .actorId(userId).correlationId(booking.getId().toString())
                .newValues(bookingAuditValues(booking))
                .metadata(Map.of("mãGhế", requestedSeatIds, "kênhĐặtVé", request.getChannel())).build());
        return toBookingResponse(booking, seats);
    }

    @Transactional
    public BookingResponse createOnlineBooking(UUID userId, CreateOnlineBookingRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new BadRequestException("Không tìm thấy người dùng");
        }

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu"));

        if (showtime.getStartTime().isBefore(now())) {
            throw new BadRequestException("Không thể đặt vé cho suất chiếu đã qua");
        }
        if (!showtime.isOnline()) {
            throw new BadRequestException("Suất chiếu này không hỗ trợ xem phim online");
        }

        Movie movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phim"));
        if (!movie.isActive()) {
            throw new BadRequestException("Phim hiện không khả dụng");
        }
        if (movie.getStreamKey() == null || movie.getStreamKey().trim().isBlank()) {
            throw new BadRequestException("Phim chưa được cấu hình nội dung xem online");
        }

        Booking booking = Booking.builder()
                .userId(userId)
                .showtimeId(request.getShowtimeId())
                .totalAmount(showtime.getOnlinePrice() != null ? showtime.getOnlinePrice() : ONLINE_MOVIE_PRICE)
                .status(BookingStatus.HOLD)
                .confirmationCode(generateConfirmationCode())
                .holdExpiresAt(now().plusMinutes(HOLD_MINUTES))
                .build();

        booking = bookingRepository.save(booking);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.ONLINE_BOOKING_CREATED).targetType("BOOKING")
                .targetId(booking.getId().toString())
                .description("Đã tạo đơn mua quyền xem phim online")
                .actorId(userId).correlationId(booking.getId().toString())
                .newValues(bookingAuditValues(booking))
                .metadata(Map.of("mãPhim", movie.getId(), "mãSuấtChiếu", showtime.getId())).build());
        return toBookingResponse(booking, List.of());
    }

    // ĐÃ THÊM: Hàm cập nhật chỗ ngồi cho Booking đang giữ
    @Transactional
    public BookingResponse updateBookingSeats(UUID bookingId, UUID userId, UpdateBookingSeatsRequest request) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé hoặc đơn không thuộc về bạn"));

        if (booking.getStatus() != BookingStatus.HOLD) {
            throw new BadRequestException("Chỉ có thể cập nhật đơn đang giữ chỗ");
        }

        if (booking.getHoldExpiresAt().isBefore(now())) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            throw new BadRequestException("Thời gian giữ chỗ đã hết. Vui lòng tạo đơn đặt vé mới");
        }

        // Nhả ghế cũ
        if (!booking.getShowtimeId().equals(request.getShowtimeId())) {
            throw new BadRequestException("Không thể đổi ghế sang một suất chiếu khác");
        }

        releaseSeats(booking);
        bookingSeatRepository.deleteAll(bookingSeatRepository.findByBookingId(bookingId));

        // Khóa ghế mới
        List<UUID> requestedSeatIds = normalizeSeatIds(request.getSeatIds());
        List<SeatAvailability> newAvailabilities = lockAvailableSeats(request.getShowtimeId(), requestedSeatIds);
        List<Seat> newSeats = loadSeatsInOrder(requestedSeatIds);
        BigDecimal seatTotal = newAvailabilities.stream()
                .map(SeatAvailability::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        for (int i = 0; i < newSeats.size(); i++) {
            BookingSeat bs = BookingSeat.builder()
                    .bookingId(booking.getId())
                    .seatId(newSeats.get(i).getId())
                    .priceAtBooking(newAvailabilities.get(i).getPrice())
                    .build();
            bookingSeatRepository.save(bs);
        }

        BigDecimal comboTotal = BigDecimal.ZERO;
        if (request.getComboIds() != null && !request.getComboIds().isEmpty()) {
            List<ComboResponse> combos = comboService.getCombos(request.getComboIds());
            for (ComboResponse combo : combos) {
                comboTotal = comboTotal.add(combo.getPrice());
            }
        }

        booking.setTotalAmount(seatTotal.add(comboTotal));
        // Reset thời gian giữ ghế thêm 10 phút tính từ lúc update
        booking.setHoldExpiresAt(now().plusMinutes(HOLD_MINUTES));
        booking = bookingRepository.save(booking);
        replaceBookingCombos(booking.getId(), request.getComboIds());

        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.BOOKING_SEATS_UPDATED).targetType("BOOKING")
                .targetId(bookingId.toString()).description("Đã cập nhật ghế trong đơn đặt vé")
                .actorId(userId).correlationId(bookingId.toString())
                .metadata(Map.of("mãGhếMới", requestedSeatIds)).build());
        return toBookingResponse(booking, newSeats);
    }

    @Transactional
    public BookingPaymentResponse payBooking(UUID bookingId, UUID userId, PayBookingRequest request) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));

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
                throw new BadRequestException("Thời gian giữ chỗ của đơn đặt vé đã hết");
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
            throw new BadRequestException("Đơn đặt vé không ở trạng thái giữ chỗ");
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
                .paidByUserId(userId)
                .amount(finalAmount)
                .paymentMethod(paymentMethod)
                .provider(resolveProvider(paymentMethod))
                .status(isExternalProvider(paymentMethod) ? PaymentStatus.PENDING : PaymentStatus.PAID)
                .transactionId(UUID.randomUUID().toString())
                .paidAt(isExternalProvider(paymentMethod) ? null : now())
                .build();
        payment = paymentRepository.save(payment);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.PAYMENT_CREATED).targetType("PAYMENT")
                .targetId(payment.getId().toString()).description("Đã khởi tạo thanh toán cho đơn đặt vé")
                .actorId(userId).correlationId(bookingId.toString())
                .newValues(paymentAuditValues(payment)).sensitive(true).build());

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
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán tương ứng với đơn PayOS")));
        payment.setProviderPaymentId(paymentId);
        payment.setTransactionId(orderCode);
        confirmExternalPayment(payment);
    }

    @Transactional
    public BookingPaymentResponse syncPayosPayment(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .filter(item -> "PAYOS".equalsIgnoreCase(String.valueOf(item.getProvider()))
                        || "PAYOS".equalsIgnoreCase(String.valueOf(item.getPaymentMethod())))
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán PayOS của đơn đặt vé này"));

        if (booking.getStatus() == BookingStatus.CONFIRMED && payment.getStatus() == PaymentStatus.PAID) {
            List<TicketResponse> tickets = ticketRepository.findByBookingId(bookingId).stream()
                    .map(TicketResponse::fromTicket)
                    .toList();
            BigDecimal originalAmount = booking.getTotalAmount();
            BigDecimal discountAmount = originalAmount.subtract(payment.getAmount()).max(BigDecimal.ZERO);
            return BookingPaymentResponse.fromPaymentResult(booking, payment, tickets, originalAmount, discountAmount, null);
        }

        PaymentGatewayService.PayosPaymentStatus status =
                paymentGatewayService.getPayosPaymentStatus(payment.getProviderCheckoutId());
        if (!status.paid()) {
            throw new BadRequestException("Thanh toán PayOS chưa được xác nhận thành công");
        }

        payment.setProviderPaymentId(status.paymentId());
        payment.setTransactionId(status.orderCode());
        return confirmExternalPayment(payment);
    }

    private BookingPaymentResponse confirmExternalPayment(Payment payment) {
        if (payment.getStatus() == PaymentStatus.PAID) {
            Booking booking = bookingRepository.findById(payment.getBookingId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
            List<TicketResponse> tickets = ticketRepository.findByBookingId(booking.getId()).stream()
                    .map(TicketResponse::fromTicket)
                    .toList();
            BigDecimal originalAmount = booking.getTotalAmount();
            BigDecimal discountAmount = originalAmount.subtract(payment.getAmount()).max(BigDecimal.ZERO);
            return BookingPaymentResponse.fromPaymentResult(booking, payment, tickets, originalAmount, discountAmount, null);
        }
        Booking booking = bookingRepository.findById(payment.getBookingId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
        if (booking.getStatus() != BookingStatus.HOLD) {
            throw new BadRequestException("Đơn đặt vé không ở trạng thái giữ chỗ");
        }
        BigDecimal originalAmount = booking.getTotalAmount();
        BigDecimal discountAmount = originalAmount.subtract(payment.getAmount()).max(BigDecimal.ZERO);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(now());
        paymentRepository.save(payment);
        return confirmPaidBooking(booking, payment, originalAmount, discountAmount, null);
    }

    private BookingPaymentResponse confirmPaidBooking(Booking booking, Payment payment,
                                                      BigDecimal originalAmount, BigDecimal discountAmount,
                                                      String discountCode) {

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(now());

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        markHeldSeatsSold(booking, bookingSeats);

        booking = bookingRepository.save(booking);
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

        boolean onlineBooking = isOnlineBooking(booking);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.PAYMENT_SUCCEEDED).targetType("PAYMENT")
                .targetId(payment.getId().toString()).description("Thanh toán đơn đặt vé thành công")
                .actorId(booking.getUserId()).correlationId(booking.getId().toString())
                .newValues(paymentAuditValues(payment)).sensitive(true).build());
        if (onlineBooking) {
            auditLogService.success(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.ONLINE_ACCESS_GRANTED).targetType("BOOKING")
                    .targetId(booking.getId().toString()).description("Đã cấp quyền xem phim online")
                    .actorId(booking.getUserId()).correlationId(booking.getId().toString())
                    .metadata(Map.of("mãSuấtChiếu", booking.getShowtimeId())).build());
        }

        loyaltyService.awardBookingPoints(booking.getId(), booking.getUserId(), payment.getAmount());

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
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
        return toBookingResponseWithoutSeats(booking);
    }

    private void replaceBookingCombos(UUID bookingId, List<UUID> comboIds) {
        bookingComboItemRepository.deleteByBookingId(bookingId);
        if (comboIds == null || comboIds.isEmpty()) return;
        Map<UUID, Long> quantities = comboIds.stream().filter(Objects::nonNull)
                .collect(Collectors.groupingBy(id -> id, LinkedHashMap::new, Collectors.counting()));
        quantities.forEach((comboId, quantity) -> bookingComboItemRepository.save(BookingComboItem.builder()
                .bookingId(bookingId).comboId(comboId).quantity(quantity.intValue()).build()));
    }

    @Transactional
    public TicketResponse checkIn(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy vé"));

        if (ticket.isCheckedIn()) {
            throw new BadRequestException("Vé đã được check-in trước đó");
        }

        Booking booking = bookingRepository.findById(ticket.getBookingId()).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Đơn đặt vé chưa được xác nhận");
        }

        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(now());
        ticket = ticketRepository.save(ticket);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.TICKET_CHECKED_IN).targetType("TICKET")
                .targetId(ticket.getId().toString()).description("Soát vé thành công")
                .correlationId(ticket.getBookingId().toString())
                .metadata(Map.of("mãVé", ticket.getTicketCode(), "thờiGianSoátVé", ticket.getCheckedInAt()))
                .build());
        return TicketResponse.fromTicket(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getBookingTickets(UUID bookingId, UUID userId) {
        bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
        return ticketRepository.findByBookingId(bookingId).stream()
                .map(TicketResponse::fromTicket)
                .toList();
    }

    @Transactional
    public void expireBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));

        if (booking.getStatus() == BookingStatus.HOLD) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            auditLogService.success(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.BOOKING_EXPIRED).targetType("BOOKING")
                    .targetId(bookingId.toString()).description("Đơn đặt vé đã hết thời gian giữ chỗ")
                    .actorId(booking.getUserId()).correlationId(bookingId.toString()).build());
        }
    }

    @Transactional
    public void cancelBooking(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy đơn đặt vé"));
        boolean onlineBooking = isOnlineBooking(booking);
        BookingStatus oldStatus = booking.getStatus();

        if (booking.getStatus() == BookingStatus.HOLD) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
        } else {
            throw new BadRequestException("Không thể hủy đơn đặt vé ở trạng thái: " + booking.getStatus());
        }
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(onlineBooking ? AuditAction.ONLINE_BOOKING_CANCELLED : AuditAction.CINEMA_BOOKING_CANCELLED)
                .targetType("BOOKING").targetId(bookingId.toString())
                .description(onlineBooking ? "Đã hủy đơn xem phim online" : "Đã hủy đơn đặt vé tại rạp")
                .actorId(userId).correlationId(bookingId.toString())
                .oldValues(Map.of("trạngThái", oldStatus))
                .newValues(Map.of("trạngThái", booking.getStatus())).build());
    }

    @Transactional
    public void releaseSeats(Booking booking) {
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat bs : bookingSeats) {
            SeatAvailability av = seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(booking.getShowtimeId(), bs.getSeatId())
                    .orElse(null);
            if (av != null && av.getStatus() == SeatBookingStatus.HOLDING) {
                av.setStatus(SeatBookingStatus.AVAILABLE);
                seatAvailabilityRepository.save(av);
            }
        }
    }

    private boolean isOnlineBooking(Booking booking) {
        return showtimeRepository.findById(booking.getShowtimeId())
                .map(Showtime::isOnline)
                .orElse(false);
    }

    private Map<String, Object> bookingAuditValues(Booking booking) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("mãNgườiDùng", booking.getUserId());
        values.put("mãSuấtChiếu", booking.getShowtimeId());
        values.put("tổngTiền", booking.getTotalAmount());
        values.put("trạngThái", booking.getStatus());
        values.put("mãXácNhận", booking.getConfirmationCode());
        values.put("hếtHạnGiữChỗ", booking.getHoldExpiresAt());
        return values;
    }

    private Map<String, Object> paymentAuditValues(Payment payment) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("mãĐơnĐặtVé", payment.getBookingId());
        values.put("sốTiền", payment.getAmount());
        values.put("phươngThức", payment.getPaymentMethod());
        values.put("nhàCungCấp", payment.getProvider());
        values.put("trạngThái", payment.getStatus());
        values.put("mãGiaoDịch", payment.getTransactionId());
        return values;
    }

    private List<UUID> normalizeSeatIds(List<UUID> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một ghế");
        }
        LinkedHashSet<UUID> uniqueSeatIds = new LinkedHashSet<>(seatIds);
        if (uniqueSeatIds.size() != seatIds.size()) {
            throw new BadRequestException("Danh sách ghế không được trùng lặp");
        }
        return new ArrayList<>(uniqueSeatIds);
    }

    private List<SeatAvailability> lockAvailableSeats(UUID showtimeId, List<UUID> seatIds) {
        List<SeatAvailability> locked = seatAvailabilityRepository.lockByShowtimeIdAndSeatIdIn(showtimeId, seatIds);
        Map<UUID, SeatAvailability> availabilityBySeatId = locked.stream()
                .collect(Collectors.toMap(SeatAvailability::getSeatId, availability -> availability));

        List<SeatAvailability> ordered = new ArrayList<>();
        for (UUID seatId : seatIds) {
            SeatAvailability availability = availabilityBySeatId.get(seatId);
            if (availability == null) {
                throw new BadRequestException("Không tìm thấy ghế trong suất chiếu này: " + seatId);
            }
            if (availability.getStatus() != SeatBookingStatus.AVAILABLE) {
                Seat seat = seatRepository.findById(seatId).orElse(null);
                String seatInfo = seat != null ? seat.getRowName() + seat.getSeatNumber() : seatId.toString();
                throw new BadRequestException("Ghế đã có người đặt: " + seatInfo);
            }
            availability.setStatus(SeatBookingStatus.HOLDING);
            ordered.add(availability);
        }

        return seatAvailabilityRepository.saveAll(ordered);
    }

    private List<Seat> loadSeatsInOrder(List<UUID> seatIds) {
        Map<UUID, Seat> seatById = seatRepository.findAllById(seatIds).stream()
                .collect(Collectors.toMap(Seat::getId, seat -> seat));
        List<Seat> seats = new ArrayList<>();
        for (UUID seatId : seatIds) {
            Seat seat = seatById.get(seatId);
            if (seat == null) {
                throw new BadRequestException("Không tìm thấy ghế: " + seatId);
            }
            seats.add(seat);
        }
        return seats;
    }

    private void markHeldSeatsSold(Booking booking, List<BookingSeat> bookingSeats) {
        if (bookingSeats.isEmpty()) {
            return;
        }

        List<UUID> seatIds = bookingSeats.stream()
                .map(BookingSeat::getSeatId)
                .toList();
        List<SeatAvailability> locked = seatAvailabilityRepository.lockByShowtimeIdAndSeatIdIn(booking.getShowtimeId(), seatIds);
        Map<UUID, SeatAvailability> availabilityBySeatId = locked.stream()
                .collect(Collectors.toMap(SeatAvailability::getSeatId, availability -> availability));

        for (BookingSeat bookingSeat : bookingSeats) {
            SeatAvailability availability = availabilityBySeatId.get(bookingSeat.getSeatId());
            if (availability == null) {
                throw new BadRequestException("Không tìm thấy ghế trong suất chiếu này: " + bookingSeat.getSeatId());
            }
            if (bookingRepository.existsByShowtimeIdAndStatusAndSeatIdAndIdNot(
                    booking.getShowtimeId(), BookingStatus.CONFIRMED, bookingSeat.getSeatId(), booking.getId())) {
                Seat seat = seatRepository.findById(bookingSeat.getSeatId()).orElse(null);
                String seatInfo = seat != null ? seat.getRowName() + seat.getSeatNumber() : bookingSeat.getSeatId().toString();
                throw new BadRequestException("Ghế đã được xác nhận bởi đơn đặt vé khác: " + seatInfo);
            }
            if (availability.getStatus() != SeatBookingStatus.HOLDING) {
                Seat seat = seatRepository.findById(bookingSeat.getSeatId()).orElse(null);
                String seatInfo = seat != null ? seat.getRowName() + seat.getSeatNumber() : bookingSeat.getSeatId().toString();
                throw new BadRequestException("Ghế không còn được giữ bởi đơn đặt vé này: " + seatInfo);
            }
            availability.setStatus(SeatBookingStatus.SOLD);
        }

        seatAvailabilityRepository.saveAll(locked);
    }

    private void sendTicketEmail(String to, Booking booking, List<Ticket> tickets, Payment payment,
                                 BigDecimal discountAmount, BigDecimal finalAmount) throws Exception {
        String subject = "Ve xem phim";
        String movieTitle = "Phim";

        Showtime s = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (s != null) {
            Movie m = movieRepository.findById(s.getMovieId()).orElse(null);
            if (m != null) {
                movieTitle = displayMovieTitle(s, m.getTitle());
                subject = "Ve xem phim - " + movieTitle;
            }
        }

        String html = buildHtmlBody(booking, tickets, payment, discountAmount, finalAmount, movieTitle);

        byte[] pdfBytes = ticketPdfGenerator.generateTicketPdf(booking, tickets);
        outboundEmailService.send(
                "BOOKING_CONFIRMED_" + booking.getId(),
                to,
                subject,
                html,
                true,
                List.of(new OutboundEmailService.Attachment(
                        "ticket.pdf", "application/pdf", pdfBytes)));
        log.info("Đã gửi email vé đến {} cho đơn đặt vé {}", to, booking.getId());
    }

    public void sendConfirmedBookingEmail(Booking booking) {
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) return;

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()
                || payment == null || tickets.isEmpty()) {
            log.warn("Bỏ qua email vé cho đơn đặt vé {} vì thiếu người dùng, thanh toán, email hoặc vé", booking.getId());
            return;
        }

        try {
            sendTicketEmail(user.getEmail(), booking, tickets, payment, BigDecimal.ZERO, payment.getAmount());
        } catch (Exception ex) {
            log.error("Không thể gửi email vé nhóm cho đơn đặt vé {}", booking.getId(), ex);
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
            log.warn("Bỏ qua email vé cho đơn đặt vé {} vì thiếu người dùng, thanh toán, email hoặc vé", bookingId);
            return;
        }

        try {
            sendTicketEmail(user.getEmail(), booking, tickets, payment, discountAmount, finalAmount);
        } catch (Exception ex) {
            log.error("Không thể gửi email vé cho đơn đặt vé {}", bookingId, ex);
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
            CinemaRoom room = s.getCinemaRoomId() != null
                    ? cinemaRoomRepository.findById(s.getCinemaRoomId()).orElse(null)
                    : null;
            if (room != null) {
                cinema = room.getName();
            } else if (s.isOnline()) {
                cinema = "Online";
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
        UUID movieId = null;
        if (booking.getShowtimeId() != null) {
            var optShowtime = showtimeRepository.findById(booking.getShowtimeId());
            if (optShowtime.isPresent()) {
                Showtime showtime = optShowtime.get();
                movieId = showtime.getMovieId();
                movieTitle = movieRepository.findById(showtime.getMovieId())
                        .map(movie -> displayMovieTitle(showtime, movie.getTitle())).orElse(null);
                cinemaRoomName = showtime.isOnline()
                        ? "Xem online"
                        : (showtime.getCinemaRoomId() != null
                                ? cinemaRoomRepository.findById(showtime.getCinemaRoomId()).map(CinemaRoom::getName).orElse(null)
                                : null);
            }
        }

        return BookingResponse.fromBooking(booking, seatResponses, movieId, movieTitle, cinemaRoomName);
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
        UUID movieId = null;
        if (booking.getShowtimeId() != null) {
            var optShowtime = showtimeRepository.findById(booking.getShowtimeId());
            if (optShowtime.isPresent()) {
                Showtime showtime = optShowtime.get();
                movieId = showtime.getMovieId();
                movieTitle = movieRepository.findById(showtime.getMovieId())
                        .map(movie -> displayMovieTitle(showtime, movie.getTitle())).orElse(null);
                cinemaRoomName = showtime.isOnline()
                        ? "Xem online"
                        : (showtime.getCinemaRoomId() != null
                                ? cinemaRoomRepository.findById(showtime.getCinemaRoomId()).map(CinemaRoom::getName).orElse(null)
                                : null);
            }
        }

        return BookingResponse.fromBooking(booking, seatResponses, movieId, movieTitle, cinemaRoomName);
    }

    private String formatMoney(BigDecimal value) {
        BigDecimal rounded = value.setScale(0, RoundingMode.HALF_UP);
        NumberFormat format = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        format.setMaximumFractionDigits(0);
        format.setMinimumFractionDigits(0);
        String formatted = format.format(rounded);
        return formatted.replace("₫", "").trim();
    }

    private String displayMovieTitle(Showtime showtime, String realTitle) {
        if (showtime == null || !showtime.isMystery()) {
            return realTitle;
        }
        LocalDateTime unlockAt = showtime.getMysteryUnlockAt() != null ? showtime.getMysteryUnlockAt() : showtime.getStartTime();
        return LocalDateTime.now().isBefore(unlockAt) ? "Mystery Movie Night" : realTitle;
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
