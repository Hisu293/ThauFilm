package com.filmticket.service;

import com.filmticket.dto.GroupBookingDto;
import com.filmticket.dto.PayBookingRequest;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.*;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GroupBookingService {
    private static final int PAYMENT_MINUTES = 15;

    private final GroupBookingRepository groupBookingRepository;
    private final GroupBookingMemberRepository memberRepository;
    private final MovieMatchInvitationRepository invitationRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatAvailabilityRepository availabilityRepository;
    private final SeatRepository seatRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;
    private final BookingService bookingService;

    @Transactional
    public GroupBooking createForAcceptedInvitation(MovieMatchInvitation invitation) {
        return groupBookingRepository.findByInvitationId(invitation.getId()).orElseGet(() -> {
            GroupBooking group = groupBookingRepository.save(GroupBooking.builder()
                    .invitationId(invitation.getId())
                    .showtimeId(invitation.getShowtimeId())
                    .status(GroupBookingStatus.WAITING_SELECTION)
                    .build());
            memberRepository.save(GroupBookingMember.builder()
                    .groupBookingId(group.getId()).userId(invitation.getSenderId()).build());
            memberRepository.save(GroupBookingMember.builder()
                    .groupBookingId(group.getId()).userId(invitation.getRecipientId()).build());
            return group;
        });
    }

    @Transactional(readOnly = true)
    public Optional<GroupBooking> findByInvitationId(UUID invitationId) {
        return groupBookingRepository.findByInvitationId(invitationId);
    }

    @Transactional
    public GroupBookingDto.Response get(UUID groupId, UUID userId) {
        GroupBooking group = requireMember(groupId, userId);
        if (isExpired(group)) expire(group);
        return toResponse(group, userId);
    }

    @Transactional
    public GroupBookingDto.Response selectSeats(UUID groupId, UUID userId, List<UUID> requestedSeatIds) {
        GroupBooking group = requireLockedMember(groupId, userId);
        if (group.getStatus() != GroupBookingStatus.WAITING_SELECTION) {
            throw new BadRequestException("Nhóm đã chọn ghế hoặc không còn hoạt động");
        }
        List<UUID> seatIds = requestedSeatIds == null ? List.of() : requestedSeatIds.stream().distinct().toList();
        if (seatIds.size() != 2) throw new BadRequestException("Phải chọn đúng 2 ghế khác nhau");

        List<Seat> seats = seatRepository.findAllById(seatIds);
        if (seats.size() != 2) throw new BadRequestException("Không tìm thấy ghế");
        seats.sort(Comparator.comparing(Seat::getRowName).thenComparing(Seat::getSeatNumber));
        Seat first = seats.get(0);
        Seat second = seats.get(1);
        if (!first.getCinemaRoomId().equals(second.getCinemaRoomId())
                || !first.getRowName().equalsIgnoreCase(second.getRowName())
                || second.getSeatNumber() - first.getSeatNumber() != 1) {
            throw new BadRequestException("Hai ghế phải nằm liền nhau trong cùng một hàng");
        }

        List<SeatAvailability> locked = availabilityRepository.lockByShowtimeIdAndSeatIdIn(group.getShowtimeId(), seatIds);
        if (locked.size() != 2 || locked.stream().anyMatch(item -> item.getStatus() != SeatBookingStatus.AVAILABLE)) {
            throw new BadRequestException("Một trong hai ghế đã được giữ hoặc đã bán");
        }
        Map<UUID, SeatAvailability> availabilityBySeat = new HashMap<>();
        locked.forEach(item -> availabilityBySeat.put(item.getSeatId(), item));

        List<GroupBookingMember> members = memberRepository.findByGroupBookingIdOrderByCreatedAtAsc(groupId);
        if (members.size() != 2) throw new BadRequestException("Booking nhóm phải có đúng 2 thành viên");
        members.sort(Comparator.comparing(member -> member.getUserId().equals(userId) ? 0 : 1));
        List<Seat> assignedSeats = List.of(first, second);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(PAYMENT_MINUTES);

        for (int index = 0; index < members.size(); index++) {
            GroupBookingMember member = members.get(index);
            Seat seat = assignedSeats.get(index);
            BigDecimal price = availabilityBySeat.get(seat.getId()).getPrice();
            Booking booking = bookingRepository.save(Booking.builder()
                    .userId(member.getUserId()).showtimeId(group.getShowtimeId())
                    .totalAmount(price).status(BookingStatus.HOLD)
                    .confirmationCode(generateCode("GB")).holdExpiresAt(expiresAt).build());
            bookingSeatRepository.save(BookingSeat.builder()
                    .bookingId(booking.getId()).seatId(seat.getId()).priceAtBooking(price).build());
            member.setSeatId(seat.getId());
            member.setBookingId(booking.getId());
            member.setAmount(price);
            memberRepository.save(member);
        }
        locked.forEach(item -> item.setStatus(SeatBookingStatus.HOLDING));
        availabilityRepository.saveAll(locked);
        group.setSelectorId(userId);
        group.setExpiresAt(expiresAt);
        group.setStatus(GroupBookingStatus.WAITING_PAYMENTS);
        groupBookingRepository.save(group);
        notifyMembers(groupId, "GROUP_SEATS_SELECTED", "Đã chọn ghế", "Cặp ghế đã được giữ. Hãy thanh toán phần của bạn.");
        return toResponse(group, userId);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public GroupBookingDto.Response pay(UUID groupId, UUID userId, PayBookingRequest request) {
        GroupBooking group = requireLockedMember(groupId, userId);
        if (isExpired(group)) {
            expire(group);
            throw new BadRequestException("Thời gian thanh toán nhóm đã hết; khoản đã trả được đánh dấu hoàn tiền");
        }
        if (!List.of(GroupBookingStatus.WAITING_PAYMENTS, GroupBookingStatus.PARTIALLY_PAID).contains(group.getStatus())) {
            throw new BadRequestException("Nhóm không ở trạng thái chờ thanh toán");
        }
        GroupBookingMember member = memberRepository.findLockedByGroupBookingIdAndUserId(groupId, userId).orElseThrow();
        if (member.getPaymentStatus() == GroupMemberPaymentStatus.PAID) {
            throw new BadRequestException("Bạn đã thanh toán phần của mình");
        }

        paymentRepository.save(Payment.builder()
                .bookingId(member.getBookingId()).amount(member.getAmount())
                .paymentMethod(request.getPaymentMethod()).status(PaymentStatus.PAID)
                .transactionId(UUID.randomUUID().toString()).paidAt(LocalDateTime.now()).build());
        member.setPaymentStatus(GroupMemberPaymentStatus.PAID);
        member.setPaidAt(LocalDateTime.now());
        memberRepository.save(member);

        List<GroupBookingMember> members = memberRepository.findByGroupBookingIdOrderByCreatedAtAsc(groupId);
        boolean allPaid = members.stream().allMatch(item -> item.getPaymentStatus() == GroupMemberPaymentStatus.PAID);
        if (allPaid) {
            confirm(group, members);
        } else {
            group.setStatus(GroupBookingStatus.PARTIALLY_PAID);
            groupBookingRepository.save(group);
            notifyMembers(groupId, "GROUP_PARTIALLY_PAID", "Đã nhận một khoản thanh toán", "Đang chờ người còn lại thanh toán.");
        }
        return toResponse(group, userId);
    }

    @Transactional
    public void expireDue() {
        List<GroupBookingStatus> active = List.of(GroupBookingStatus.WAITING_PAYMENTS, GroupBookingStatus.PARTIALLY_PAID);
        groupBookingRepository.findByStatusInAndExpiresAtBefore(active, LocalDateTime.now()).forEach(this::expire);
    }

    private void confirm(GroupBooking group, List<GroupBookingMember> members) {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> confirmedBookings = new ArrayList<>();
        for (GroupBookingMember member : members) {
            Booking booking = bookingRepository.findById(member.getBookingId()).orElseThrow();
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setConfirmedAt(now);
            bookingRepository.save(booking);
            confirmedBookings.add(booking);
            availabilityRepository.findByShowtimeIdAndSeatId(group.getShowtimeId(), member.getSeatId()).ifPresent(item -> {
                item.setStatus(SeatBookingStatus.SOLD);
                availabilityRepository.save(item);
            });
            ticketRepository.save(Ticket.builder().bookingId(booking.getId()).seatId(member.getSeatId())
                    .ticketCode(generateCode("TK")).checkedIn(false).build());
        }
        group.setStatus(GroupBookingStatus.CONFIRMED);
        group.setConfirmedAt(now);
        groupBookingRepository.save(group);
        notifyMembers(group.getId(), "GROUP_BOOKING_CONFIRMED", "Đặt vé nhóm thành công", "Cả hai đã thanh toán. Vé đã được phát hành.");
        confirmedBookings.forEach(bookingService::sendConfirmedBookingEmail);
    }

    private boolean isExpired(GroupBooking group) {
        return group.getExpiresAt() != null && group.getExpiresAt().isBefore(LocalDateTime.now())
                && List.of(GroupBookingStatus.WAITING_PAYMENTS, GroupBookingStatus.PARTIALLY_PAID).contains(group.getStatus());
    }

    private void expire(GroupBooking group) {
        for (GroupBookingMember member : memberRepository.findByGroupBookingIdOrderByCreatedAtAsc(group.getId())) {
            if (member.getPaymentStatus() == GroupMemberPaymentStatus.PAID) {
                paymentRepository.findByBookingId(member.getBookingId()).ifPresent(payment -> {
                    payment.setStatus(PaymentStatus.REFUNDED);
                    paymentRepository.save(payment);
                });
                member.setPaymentStatus(GroupMemberPaymentStatus.REFUNDED);
                memberRepository.save(member);
            }
            bookingRepository.findById(member.getBookingId()).ifPresent(booking -> {
                booking.setStatus(BookingStatus.EXPIRED);
                bookingRepository.save(booking);
            });
            availabilityRepository.findByShowtimeIdAndSeatId(group.getShowtimeId(), member.getSeatId()).ifPresent(item -> {
                item.setStatus(SeatBookingStatus.AVAILABLE);
                availabilityRepository.save(item);
            });
        }
        group.setStatus(GroupBookingStatus.EXPIRED);
        groupBookingRepository.save(group);
        notifyMembers(group.getId(), "GROUP_BOOKING_EXPIRED", "Đặt vé nhóm đã hết hạn", "Ghế đã được giải phóng; khoản đã trả được hoàn lại.");
    }

    private GroupBooking requireMember(UUID groupId, UUID userId) {
        GroupBooking group = groupBookingRepository.findById(groupId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy booking nhóm"));
        if (memberRepository.findByGroupBookingIdAndUserId(groupId, userId).isEmpty()) {
            throw new BadRequestException("Bạn không thuộc booking nhóm này");
        }
        return group;
    }

    private GroupBooking requireLockedMember(UUID groupId, UUID userId) {
        GroupBooking group = groupBookingRepository.findLockedById(groupId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy booking nhóm"));
        if (memberRepository.findByGroupBookingIdAndUserId(groupId, userId).isEmpty()) {
            throw new BadRequestException("Bạn không thuộc booking nhóm này");
        }
        return group;
    }

    private GroupBookingDto.Response toResponse(GroupBooking group, UUID currentUserId) {
        List<GroupBookingDto.MemberResponse> members = memberRepository.findByGroupBookingIdOrderByCreatedAtAsc(group.getId()).stream()
                .map(member -> {
                    Seat seat = member.getSeatId() == null ? null : seatRepository.findById(member.getSeatId()).orElse(null);
                    User user = userRepository.findById(member.getUserId()).orElse(null);
                    return GroupBookingDto.MemberResponse.builder()
                            .userId(member.getUserId()).fullName(user == null ? "Thành viên" : user.getFullName())
                            .seatId(member.getSeatId()).seatLabel(seat == null ? null : seat.getRowName() + seat.getSeatNumber())
                            .amount(member.getAmount()).paymentStatus(member.getPaymentStatus().name())
                            .bookingId(member.getBookingId()).currentUser(member.getUserId().equals(currentUserId)).build();
                }).toList();
        GroupBookingMember me = memberRepository.findByGroupBookingIdAndUserId(group.getId(), currentUserId).orElseThrow();
        return GroupBookingDto.Response.builder().id(group.getId()).invitationId(group.getInvitationId())
                .showtimeId(group.getShowtimeId()).status(group.getStatus().name()).selectorId(group.getSelectorId())
                .canSelectSeats(group.getStatus() == GroupBookingStatus.WAITING_SELECTION)
                .canPay(List.of(GroupBookingStatus.WAITING_PAYMENTS, GroupBookingStatus.PARTIALLY_PAID).contains(group.getStatus())
                        && me.getPaymentStatus() == GroupMemberPaymentStatus.PENDING)
                .expiresAt(group.getExpiresAt()).confirmedAt(group.getConfirmedAt()).members(members).build();
    }

    private void notifyMembers(UUID groupId, String type, String title, String body) {
        for (GroupBookingMember member : memberRepository.findByGroupBookingIdOrderByCreatedAtAsc(groupId)) {
            realtimeEventService.notifyUser(member.getUserId(), type, title, body, "/booking/group/" + groupId);
        }
    }

    private String generateCode(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
