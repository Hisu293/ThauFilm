package com.filmticket.service;

import com.filmticket.dto.WatchPartyDto;
import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.dto.RefundRequestDto;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Payment;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.ShowtimeStatus;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.UserRepository;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class WatchPartyService {
    private static final BigDecimal DEFAULT_MOVIE_PRICE = BigDecimal.valueOf(89000);
    private static final int MAX_CHAT_HISTORY = 80;
    private static final int WATCH_PARTY_GRACE_MINUTES = 5;

    private final MovieRepository movieRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;
    private final PaymentGatewayService paymentGatewayService;
    private final MovieStreamService movieStreamService;
    private final AuditLogService auditLogService;
    private final PaymentRepository paymentRepository;
    private final ShowtimeRepository showtimeRepository;
    private final RefundRequestService refundRequestService;
    private final Map<UUID, WatchPartyRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, PendingWatchPartyPayment> pendingPayments = new ConcurrentHashMap<>();

    public WatchPartyDto.Response create(UUID movieId, UUID showtimeId, UUID userId) {
        Movie movie = requireMovie(movieId);
        User user = requireUser(userId);
        Showtime onlineShowtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu online đã chọn"));
        if (!onlineShowtime.getMovieId().equals(movieId) || !onlineShowtime.isOnline()) {
            throw new BadRequestException("Suất chiếu online không thuộc phim đã chọn");
        }
        if (!onlineShowtime.getEndTime().isAfter(java.time.LocalDateTime.now())
                || onlineShowtime.getStatus() == ShowtimeStatus.CANCELLED
                || onlineShowtime.getStatus() == ShowtimeStatus.COMPLETED) {
            throw new BadRequestException("Suất chiếu online đã kết thúc hoặc không còn hoạt động");
        }
        BigDecimal price = onlineShowtime.getOnlinePrice() != null
                ? onlineShowtime.getOnlinePrice()
                : DEFAULT_MOVIE_PRICE;
        WatchPartyRoom room = new WatchPartyRoom(UUID.randomUUID(), movie, onlineShowtime.getId(), price);
        room.members.put(userId, new WatchPartyMember(user, true));
        rooms.put(room.id, room);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.WATCH_PARTY_CREATED).targetType("WATCH_PARTY")
                .targetId(room.id.toString()).actorId(userId)
                .description("Đã tạo phòng xem chung cho phim \"" + movie.getTitle() + "\"")
                .metadata(Map.of("mãPhim", movieId, "giáMỗiThànhViên", room.pricePerMember)).build());
        return toResponse(room, userId);
    }

    public WatchPartyDto.Response get(UUID roomId, UUID userId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            ensureMember(room, userId);
            return toResponse(room, userId);
        }
    }

    @Transactional
    public WatchPartyDto.Response pay(UUID roomId, UUID userId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (member.paid) {
                return toResponse(room, userId);
            }
            if (member.checkoutUrl != null && !member.checkoutUrl.isBlank()) {
                WatchPartyDto.Response response = toResponse(room, userId);
                response.setCheckoutUrl(member.checkoutUrl);
                response.setQrCode(member.qrCode);
                return response;
            }
            Booking booking = Booking.builder()
                    .userId(userId)
                    .showtimeId(room.showtimeId)
                    .totalAmount(room.pricePerMember)
                    .status(BookingStatus.HOLD)
                    .confirmationCode("WP" + UUID.randomUUID().toString()
                            .replace("-", "").substring(0, 10).toUpperCase())
                    .holdExpiresAt(java.time.LocalDateTime.now().plusMinutes(15))
                    .build();
            booking = bookingRepository.save(booking);
            member.bookingId = booking.getId();

            Payment payment = Payment.builder()
                    .bookingId(booking.getId())
                    .paidByUserId(userId)
                    .amount(room.pricePerMember)
                    .paymentMethod("PAYOS")
                    .provider("PAYOS")
                    .status(com.filmticket.entity.PaymentStatus.PENDING)
                    .transactionId(UUID.randomUUID().toString())
                    .build();
            payment = paymentRepository.save(payment);
            String partyPath = "/watch-party/" + room.id;
            PaymentGatewayService.GatewayPayment gatewayPayment = paymentGatewayService.createGatewayPayment(
                    "PAYOS",
                    payment,
                    "ThauFilm Watch Party",
                    partyPath,
                    partyPath
            );
            payment.setProviderCheckoutId(gatewayPayment.checkoutId());
            payment.setProviderPaymentId(gatewayPayment.paymentId());
            payment.setCheckoutUrl(gatewayPayment.checkoutUrl());
            payment.setQrCode(gatewayPayment.qrCode());
            payment.setTransactionId(gatewayPayment.checkoutId());
            paymentRepository.save(payment);
            member.checkoutUrl = gatewayPayment.checkoutUrl();
            member.qrCode = gatewayPayment.qrCode();
            member.checkoutId = gatewayPayment.checkoutId();
            member.paymentId = gatewayPayment.paymentId();
            member.paymentRecordId = payment.getId();
            pendingPayments.put(gatewayPayment.checkoutId(), new PendingWatchPartyPayment(room.id, userId));
            pendingPayments.put(gatewayPayment.paymentId(), new PendingWatchPartyPayment(room.id, userId));
            WatchPartyDto.Response response = toResponse(room, userId);
            response.setCheckoutUrl(gatewayPayment.checkoutUrl());
            response.setQrCode(gatewayPayment.qrCode());
            return response;
        }
    }

    @Transactional
    public boolean confirmPayosPayment(String orderCode, String paymentId) {
        PendingWatchPartyPayment pending = orderCode == null ? null : pendingPayments.get(orderCode);
        if (pending == null && paymentId != null) pending = pendingPayments.get(paymentId);
        if (pending == null) return false;

        WatchPartyRoom room = rooms.get(pending.roomId());
        if (room == null) return false;
        synchronized (room) {
            WatchPartyMember member = room.members.get(pending.userId());
            if (member == null) return false;
            markMemberPaid(member, orderCode, paymentId);
            auditLogService.success(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.PAYMENT_SUCCEEDED).targetType("WATCH_PARTY")
                    .targetId(room.id.toString()).actorId(pending.userId())
                    .description("Thành viên thanh toán phòng xem chung thành công")
                    .correlationId(room.id.toString()).providerEventId(paymentId)
                    .newValues(Map.of("sốTiền", room.pricePerMember, "trạngThái", "ĐÃ THANH TOÁN"))
                    .sensitive(true).build());
            realtimeEventService.sendWatchPartyEvent(room.id, "WATCH_PARTY_UPDATED", toResponse(room, pending.userId()));
            if (orderCode != null) pendingPayments.remove(orderCode);
            if (paymentId != null) pendingPayments.remove(paymentId);
            return true;
        }
    }

    @Transactional
    public WatchPartyDto.Response syncCurrentUserPayment(UUID roomId, UUID userId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (!member.paid) {
                String checkoutId = blankToNull(member.checkoutId);
                if (checkoutId == null) {
                    throw new BadRequestException("Vui lòng tạo thanh toán phần của bạn trước khi cập nhật trạng thái");
                }
                PaymentGatewayService.PayosPaymentStatus status =
                        paymentGatewayService.getPayosPaymentStatus(checkoutId);
                if (!status.paid()) {
                    throw new BadRequestException("Giao dịch PayOS chưa được thanh toán");
                }
                markMemberPaid(member, status.orderCode(), status.paymentId());
                realtimeEventService.sendWatchPartyEvent(room.id, "WATCH_PARTY_UPDATED", toResponse(room, userId));
            }
            return toResponse(room, userId);
        }
    }

    public RefundRequestDto requestRefund(UUID roomId, UUID userId, String reason,
                                          String method, String bankBin, String accountNumber) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (!member.paid || member.bookingId == null || member.paymentRecordId == null)
                throw new BadRequestException("Bạn chưa thanh toán Watch Party");
            return refundRequestService.requestForWatchParty(
                    userId, roomId, member.bookingId, member.paymentRecordId,
                    reason, method, bankBin, accountNumber);
        }
    }

    public WatchPartyDto.Response updatePlayback(UUID roomId, UUID userId, double currentTime, boolean paused) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            ensureMember(room, userId);
            room.playback = new PlaybackState(Math.max(0, currentTime), paused, Instant.now(), userId);
            WatchPartyDto.Response response = toResponse(room, userId);
            realtimeEventService.sendWatchPartyEvent(roomId, "WATCH_PARTY_PLAYBACK", response.getPlayback());
            return response;
        }
    }

    public MovieStreamResponse getStream(UUID roomId, UUID userId, String deviceId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (!member.paid) {
                throw new BadRequestException("Vui lòng thanh toán vé Watch Party trước khi xem");
            }
            if (!isReadyToWatch(room)) {
                throw new BadRequestException("Phòng đang chờ tất cả thành viên thanh toán");
            }
            if (member.bookingId == null) {
                throw new BadRequestException("Không tìm thấy booking của thành viên Watch Party");
            }
            return movieStreamService.getWatchPartyStream(
                    room.movie, userId, member.bookingId, room.showtimeId, deviceId);
        }
    }

    public void heartbeatStream(UUID roomId, UUID userId, String deviceId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (member.bookingId == null || !member.paid) {
                throw new BadRequestException("Không tìm thấy phiên xem Watch Party đã thanh toán");
            }
            movieStreamService.heartbeatBooking(member.bookingId, userId, deviceId);
        }
    }

    public void releaseStream(UUID roomId, UUID userId, String deviceId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            if (member.bookingId != null) {
                movieStreamService.releaseBooking(member.bookingId, userId, deviceId);
            }
        }
    }

    public WatchPartyDto.ChatMessageResponse sendChat(UUID roomId, UUID userId, String content) {
        WatchPartyRoom room = requireRoom(roomId);
        String normalized = content == null ? "" : content.trim();
        if (normalized.isBlank()) {
            throw new BadRequestException("Tin nhắn không được để trống");
        }
        if (normalized.length() > 500) {
            normalized = normalized.substring(0, 500);
        }
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            WatchPartyDto.ChatMessageResponse message = WatchPartyDto.ChatMessageResponse.builder()
                    .id(UUID.randomUUID())
                    .senderId(userId)
                    .senderName(displayName(member.user))
                    .content(normalized)
                    .createdAt(Instant.now())
                    .build();
            room.messages.add(message);
            if (room.messages.size() > MAX_CHAT_HISTORY) {
                room.messages.remove(0);
            }
            realtimeEventService.sendWatchPartyEvent(roomId, "WATCH_PARTY_CHAT", message);
            return message;
        }
    }

    public Map<String, Object> sendReaction(UUID roomId, UUID userId, String reaction) {
        WatchPartyRoom room = requireRoom(roomId);
        String value = reaction == null ? "" : reaction.trim();
        if (!List.of("❤️", "😂", "😮").contains(value)) {
            throw new BadRequestException("Biểu cảm không được hỗ trợ");
        }
        synchronized (room) {
            WatchPartyMember member = ensureMember(room, userId);
            Map<String, Object> event = Map.of(
                    "id", UUID.randomUUID(),
                    "userId", userId,
                    "senderName", displayName(member.user),
                    "reaction", value,
                    "createdAt", Instant.now()
            );
            realtimeEventService.sendWatchPartyEvent(roomId, "WATCH_PARTY_REACTION", event);
            return event;
        }
    }

    public void authorize(UUID roomId, UUID userId) {
        WatchPartyRoom room = requireRoom(roomId);
        synchronized (room) {
            ensureMember(room, userId);
        }
    }

    private WatchPartyRoom requireRoom(UUID roomId) {
        WatchPartyRoom room = rooms.get(roomId);
        if (room == null) throw new BadRequestException("Không tìm thấy phòng Watch Party");
        if (Instant.now().isAfter(room.expiresAt)) {
            throw new BadRequestException("Watch party đã hết thời gian xem phim");
        }
        return room;
    }

    private Movie requireMovie(UUID movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phim"));
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
    }

    private WatchPartyMember ensureMember(WatchPartyRoom room, UUID userId) {
        WatchPartyMember existing = room.members.get(userId);
        if (existing != null) return existing;
        User user = requireUser(userId);
        WatchPartyMember member = new WatchPartyMember(user, false);
        room.members.put(userId, member);
        realtimeEventService.sendWatchPartyEvent(room.id, "WATCH_PARTY_UPDATED", toResponse(room, userId));
        return member;
    }

    private WatchPartyDto.Response toResponse(WatchPartyRoom room, UUID currentUserId) {
        List<WatchPartyDto.MemberResponse> members = room.members.values().stream()
                .map(member -> WatchPartyDto.MemberResponse.builder()
                        .userId(member.user.getId())
                        .fullName(displayName(member.user))
                        .email(member.user.getEmail())
                        .creator(member.creator)
                        .currentUser(member.user.getId().equals(currentUserId))
                        .paid(member.paid)
                        .build())
                .toList();
        boolean readyToWatch = isReadyToWatch(room);
        boolean currentUserPaid = room.members.get(currentUserId) != null && room.members.get(currentUserId).paid;
        return WatchPartyDto.Response.builder()
                .id(room.id)
                .movieId(room.movie.getId())
                .movieTitle(room.movie.getTitle())
                .posterUrl(room.movie.getPosterUrl())
                .expiresAt(room.expiresAt)
                .pricePerMember(room.pricePerMember)
                .readyToWatch(readyToWatch)
                .currentUserPaid(currentUserPaid)
                .checkoutUrl(room.members.get(currentUserId) != null ? room.members.get(currentUserId).checkoutUrl : null)
                .qrCode(room.members.get(currentUserId) != null ? room.members.get(currentUserId).qrCode : null)
                .invitePath("/watch-party/" + room.id)
                .members(members)
                .messages(List.copyOf(room.messages))
                .playback(toPlaybackResponse(room.playback))
                .build();
    }

    private WatchPartyDto.PlaybackStateResponse toPlaybackResponse(PlaybackState playback) {
        return WatchPartyDto.PlaybackStateResponse.builder()
                .currentTime(playback.currentTime)
                .paused(playback.paused)
                .updatedAt(playback.updatedAt)
                .updatedBy(playback.updatedBy)
                .build();
    }

    private void markMemberPaid(WatchPartyMember member, String checkoutId, String paymentId) {
        member.paid = true;
        if (checkoutId != null && !checkoutId.isBlank()) {
            member.checkoutId = checkoutId;
            pendingPayments.remove(checkoutId);
        }
        if (paymentId != null && !paymentId.isBlank()) {
            member.paymentId = paymentId;
            pendingPayments.remove(paymentId);
        }
        if (member.paymentRecordId != null) {
            paymentRepository.findById(member.paymentRecordId).ifPresent(payment -> {
                payment.setStatus(com.filmticket.entity.PaymentStatus.PAID);
                payment.setPaidAt(java.time.LocalDateTime.now());
                payment.setProviderPaymentId(paymentId);
                paymentRepository.save(payment);
            });
        }
        if (member.bookingId != null) {
            bookingRepository.findById(member.bookingId).ifPresent(booking -> {
                if (booking.getStatus() == BookingStatus.HOLD) {
                    booking.setStatus(BookingStatus.CONFIRMED);
                    booking.setConfirmedAt(java.time.LocalDateTime.now());
                    bookingRepository.save(booking);
                }
            });
        }
    }

    private String blankToNull(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private boolean isReadyToWatch(WatchPartyRoom room) {
        if (room.openedForWatch) return true;
        boolean allCurrentMembersPaid = !room.members.isEmpty()
                && room.members.values().stream().allMatch(member -> member.paid);
        if (allCurrentMembersPaid) {
            room.openedForWatch = true;
        }
        return room.openedForWatch;
    }

    private String displayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) return user.getFullName();
        if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail().split("@")[0];
        return "Thành viên";
    }

    private static class WatchPartyRoom {
        private final UUID id;
        private final Movie movie;
        private final UUID showtimeId;
        private final BigDecimal pricePerMember;
        private final Instant expiresAt;
        private final Map<UUID, WatchPartyMember> members = new LinkedHashMap<>();
        private final List<WatchPartyDto.ChatMessageResponse> messages = new ArrayList<>();
        private PlaybackState playback = new PlaybackState(0, true, Instant.now(), null);
        private boolean openedForWatch;

        private WatchPartyRoom(UUID id, Movie movie, UUID showtimeId, BigDecimal pricePerMember) {
            this.id = id;
            this.movie = movie;
            this.showtimeId = showtimeId;
            this.pricePerMember = pricePerMember;
            int durationMinutes = movie.getDurationMinutes() == null ? 0 : movie.getDurationMinutes();
            this.expiresAt = Instant.now().plusSeconds((long) (durationMinutes + WATCH_PARTY_GRACE_MINUTES) * 60);
        }
    }

    private static class WatchPartyMember {
        private final User user;
        private final boolean creator;
        private boolean paid;
        private String checkoutUrl;
        private String qrCode;
        private String checkoutId;
        private String paymentId;
        private UUID bookingId;
        private UUID paymentRecordId;

        private WatchPartyMember(User user, boolean creator) {
            this.user = user;
            this.creator = creator;
        }
    }

    private record PlaybackState(double currentTime, boolean paused, Instant updatedAt, UUID updatedBy) {}
    private record PendingWatchPartyPayment(UUID roomId, UUID userId) {}
}
