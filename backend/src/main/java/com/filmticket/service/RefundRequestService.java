package com.filmticket.service;

import com.filmticket.dto.RefundRequestDto;
import com.filmticket.dto.RefundMessageDto;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RefundRequestService {
    private static final Set<RefundRequestStatus> ACTIVE = EnumSet.of(
            RefundRequestStatus.REQUESTED, RefundRequestStatus.PENDING_APPROVAL,
            RefundRequestStatus.REFUND_PENDING);

    private final RefundRequestRepository refundRepository;
    private final RefundMessageRepository messageRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final StaffEmploymentProfileRepository profileRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final BookingService bookingService;
    private final RealtimeEventService realtimeEventService;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final AuditLogService auditLogService;

    @Value("${refund.staff-approval-threshold:200000}")
    private BigDecimal staffApprovalThreshold;

    @Transactional
    public RefundRequestDto requestByCustomer(UUID customerId, UUID bookingId, String ticketCode, String reason) {
        Booking booking = requireBooking(bookingId);
        if (!booking.getUserId().equals(customerId)) throw new BadRequestException("Bạn không có quyền yêu cầu hoàn vé này");
        RefundRequest request = createRequest(booking, null, ticketCode, reason);
        saveMessage(request, customerId, "MEMBER", reason);
        notifyShiftLeaders("Yêu cầu hoàn tiền mới", "Khách hàng vừa gửi yêu cầu cho vé " + request.getTicketCode());
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.REFUND_REQUESTED).targetType("REFUND_REQUEST")
                .targetId(request.getId().toString()).actorId(customerId)
                .description("Khách hàng đã gửi yêu cầu hoàn tiền")
                .reason(request.getReason()).correlationId(bookingId.toString())
                .newValues(Map.of("sốTiền", request.getAmount(), "trạngThái", request.getStatus()))
                .sensitive(true).build());
        return toDto(request);
    }

    @Transactional
    public RefundRequestDto requestByStaff(UUID staffId, UUID bookingId, String ticketCode, String reason) {
        requireShiftLeader(staffId);
        RefundRequest request = createRequest(requireBooking(bookingId), staffId, ticketCode, reason);
        saveMessage(request, staffId, "STAFF", reason);
        realtimeEventService.notifyUser(request.getCustomerId(), "REFUND_REQUESTED", "Đã tiếp nhận yêu cầu hoàn tiền",
                "Staff trưởng đã tạo yêu cầu hoàn tiền cho vé " + request.getTicketCode(), "/my-bookings/" + bookingId);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.REFUND_REQUESTED).targetType("REFUND_REQUEST")
                .targetId(request.getId().toString()).actorId(staffId)
                .description("Nhân viên đã tạo yêu cầu hoàn tiền")
                .reason(request.getReason()).correlationId(bookingId.toString())
                .newValues(Map.of("sốTiền", request.getAmount(), "trạngThái", request.getStatus()))
                .sensitive(true).build());
        return toDto(request);
    }

    @Transactional(readOnly = true)
    public List<RefundRequestDto> customerRequests(UUID customerId) {
        return enrich(refundRepository.findByCustomerIdOrderByCreatedAtDesc(customerId));
    }

    @Transactional(readOnly = true)
    public List<RefundRequestDto> staffRequests(UUID staffId) {
        requireShiftLeader(staffId);
        return enrich(refundRepository.findAllByOrderByCreatedAtDesc());
    }

    @Transactional(readOnly = true)
    public List<RefundRequestDto> adminRequests() {
        return enrich(refundRepository.findAllByOrderByCreatedAtDesc());
    }

    @Transactional
    public RefundRequestDto staffApprove(UUID staffId, UUID requestId) {
        requireShiftLeader(staffId);
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.REQUESTED);
        validateEligibility(request);
        if (request.getAmount().compareTo(staffApprovalThreshold) >= 0) {
            requireRefundQr(request);
        }
        request.setStaffId(staffId);
        request.setReviewedBy(staffId);
        request.setReviewedAt(LocalDateTime.now());
        if (request.getAmount().compareTo(staffApprovalThreshold) >= 0) {
            request.setRequiresAdmin(true);
            request.setStatus(RefundRequestStatus.PENDING_APPROVAL);
            RefundRequest saved = refundRepository.save(request);
            notifyAdmins("Yêu cầu hoàn tiền chờ duyệt", "Yêu cầu " + saved.getTicketCode() + " trị giá " + saved.getAmount() + "đ cần Admin duyệt");
            notifyCustomer(saved, "Yêu cầu đang chờ Admin duyệt", "Staff trưởng đã kiểm tra và chuyển yêu cầu hoàn tiền lên Admin.");
            return toDto(saved);
        }
        request.setRequiresAdmin(false);
        return completeRefund(request, staffId);
    }

    @Transactional
    public RefundRequestDto adminApprove(UUID adminId, UUID requestId) {
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.PENDING_APPROVAL);
        validateEligibility(request);
        requireRefundQr(request);
        RefundRequestDto result = completeRefund(request, adminId);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.REFUND_APPROVED).targetType("REFUND_REQUEST")
                .targetId(requestId.toString()).actorId(adminId)
                .description("Quản trị viên đã phê duyệt hoàn tiền")
                .reason(request.getReason()).correlationId(request.getBookingId().toString())
                .newValues(Map.of("sốTiền", request.getAmount(), "trạngThái", request.getStatus()))
                .sensitive(true).build());
        return result;
    }

    @Transactional
    public RefundRequestDto staffReject(UUID staffId, UUID requestId, String reason) {
        requireShiftLeader(staffId);
        return reject(requireStatus(requestId, RefundRequestStatus.REQUESTED), staffId, reason);
    }

    @Transactional
    public RefundRequestDto adminReject(UUID adminId, UUID requestId, String reason) {
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.PENDING_APPROVAL);
        RefundRequestDto result = reject(request, adminId, reason);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.REFUND_REJECTED).targetType("REFUND_REQUEST")
                .targetId(requestId.toString()).actorId(adminId)
                .description("Quản trị viên đã từ chối hoàn tiền")
                .reason(reason).correlationId(request.getBookingId().toString())
                .newValues(Map.of("trạngThái", request.getStatus())).sensitive(true).build());
        return result;
    }

    public Map<String, Object> staffAccess(UUID staffId) {
        boolean leader = profileRepository.findById(staffId).map(StaffEmploymentProfile::isShiftLeader).orElse(false);
        return Map.of("staffId", staffId, "shiftLeader", leader,
                "refundApprovalThreshold", staffApprovalThreshold);
    }

    @Transactional(readOnly = true)
    public List<RefundMessageDto> customerMessages(UUID customerId, UUID requestId) {
        RefundRequest request = requireOwnedRequest(customerId, requestId);
        return messageDtos(request);
    }

    @Transactional
    public RefundMessageDto customerMessage(UUID customerId, UUID requestId, String content) {
        RefundRequest request = requireOwnedRequest(customerId, requestId);
        RefundMessage message = saveMessage(request, customerId, "MEMBER", content);
        notifyShiftLeaders("Tin nhắn hoàn tiền mới", "Khách hàng vừa nhắn về vé " + request.getTicketCode());
        return messageDto(message);
    }

    @Transactional
    public RefundMessageDto customerQrMessage(UUID customerId, UUID requestId, MultipartFile image, String caption) {
        RefundRequest request = requireOwnedRequest(customerId, requestId);
        if (request.getStatus() != RefundRequestStatus.REQUESTED
                && request.getStatus() != RefundRequestStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ được cập nhật QR khi yêu cầu đang chờ duyệt");
        }
        CloudinaryStorageService.UploadedImage uploaded = cloudinaryStorageService.upload(image);
        try {
            String content = clean(caption);
            if (content.length() > 500) throw new BadRequestException("Chú thích ảnh không được vượt quá 500 ký tự");
            RefundMessage message = messageRepository.saveAndFlush(RefundMessage.builder()
                    .refundRequestId(request.getId())
                    .senderId(customerId)
                    .senderRole("MEMBER")
                    .content(content.isEmpty() ? "Ảnh QR nhận hoàn tiền" : content)
                    .imageUrl(uploaded.secureUrl())
                    .imagePublicId(uploaded.publicId())
                    .build());
            request.setRefundQrMessageId(message.getId());
            refundRepository.saveAndFlush(request);
            notifyShiftLeaders("Khách hàng đã gửi QR hoàn tiền",
                    "QR nhận tiền cho vé " + request.getTicketCode() + " đã sẵn sàng để kiểm tra");
            if (request.getStatus() == RefundRequestStatus.PENDING_APPROVAL) {
                notifyAdmins("Khách hàng đã bổ sung QR hoàn tiền",
                        "QR nhận tiền cho vé " + request.getTicketCode() + " đã sẵn sàng để duyệt");
            }
            return messageDto(message);
        } catch (RuntimeException exception) {
            cloudinaryStorageService.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<RefundMessageDto> staffMessages(UUID staffId, UUID requestId) {
        requireShiftLeader(staffId);
        RefundRequest request = refundRepository.findById(requestId).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        return messageDtos(request);
    }

    @Transactional
    public RefundMessageDto staffMessage(UUID staffId, UUID requestId, String content) {
        requireShiftLeader(staffId);
        RefundRequest request = refundRepository.findById(requestId).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStaffId() == null) request.setStaffId(staffId);
        refundRepository.save(request);
        RefundMessage message = saveMessage(request, staffId, "STAFF", content);
        realtimeEventService.notifyUser(request.getCustomerId(), "REFUND_MESSAGE", "Staff trưởng đã phản hồi",
                clean(content), "/my-bookings/" + request.getBookingId());
        return messageDto(message);
    }

    private RefundRequest createRequest(Booking booking, UUID staffId, String rawTicketCode, String rawReason) {
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw new BadRequestException("Chỉ vé đã thanh toán và xác nhận mới được yêu cầu hoàn");
        Payment payment = paymentRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán"));
        if (payment.getStatus() != PaymentStatus.PAID) throw new BadRequestException("Thanh toán không ở trạng thái đã trả tiền");
        refundRepository.findFirstByBookingIdAndStatusIn(booking.getId(), ACTIVE).ifPresent(existing -> {
            throw new BadRequestException("Booking đã có một yêu cầu hoàn tiền đang xử lý");
        });
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        if (tickets.isEmpty()) throw new BadRequestException("Booking chưa có vé");
        String ticketCode = clean(rawTicketCode);
        Ticket selected = ticketCode.isEmpty() ? tickets.get(0) : tickets.stream()
                .filter(ticket -> ticket.getTicketCode().equalsIgnoreCase(ticketCode)).findFirst()
                .orElseThrow(() -> new BadRequestException("Mã vé không thuộc booking này"));
        String reason = clean(rawReason);
        if (reason.length() < 10) throw new BadRequestException("Lý do hoàn tiền cần ít nhất 10 ký tự");
        boolean checkedIn = tickets.stream().anyMatch(Ticket::isCheckedIn);
        if (checkedIn) throw new BadRequestException("Vé đã check-in nên không đủ điều kiện hoàn tiền");
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (showtime != null && !showtime.getStartTime().isAfter(LocalDateTime.now()))
            throw new BadRequestException("Suất chiếu đã bắt đầu nên không đủ điều kiện hoàn tiền");
        return refundRepository.save(RefundRequest.builder()
                .bookingId(booking.getId()).paymentId(payment.getId()).customerId(booking.getUserId())
                .staffId(staffId).ticketCode(selected.getTicketCode()).amount(payment.getAmount())
                .reason(reason).ticketCheckedIn(false).requiresAdmin(payment.getAmount().compareTo(staffApprovalThreshold) >= 0)
                .status(RefundRequestStatus.REQUESTED).build());
    }

    private RefundRequest requireOwnedRequest(UUID customerId, UUID requestId) {
        RefundRequest request = refundRepository.findById(requestId).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        if (!request.getCustomerId().equals(customerId)) throw new BadRequestException("Bạn không có quyền xem trao đổi này");
        return request;
    }

    private RefundMessage saveMessage(RefundRequest request, UUID senderId, String role, String rawContent) {
        String content = clean(rawContent);
        if (content.isEmpty() || content.length() > 2000) throw new BadRequestException("Tin nhắn phải từ 1 đến 2000 ký tự");
        return messageRepository.save(RefundMessage.builder().refundRequestId(request.getId()).senderId(senderId)
                .senderRole(role).content(content).build());
    }

    private List<RefundMessageDto> messageDtos(RefundRequest request) {
        return messageRepository.findByRefundRequestIdOrderByCreatedAtAsc(request.getId()).stream().map(this::messageDto).toList();
    }

    private RefundMessageDto messageDto(RefundMessage message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        return RefundMessageDto.builder().id(message.getId()).senderId(message.getSenderId())
                .senderName(sender == null ? message.getSenderRole() : sender.getFullName()).senderRole(message.getSenderRole())
                .content(message.getContent()).imageUrl(message.getImageUrl()).createdAt(message.getCreatedAt()).build();
    }

    private RefundRequestDto completeRefund(RefundRequest request, UUID reviewerId) {
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán"));
        if (payment.getStatus() != PaymentStatus.PAID) throw new BadRequestException("Thanh toán không còn đủ điều kiện hoàn");
        PaymentGatewayService.GatewayRefund result = paymentGatewayService.refund(payment, request.getReason());
        payment.setStatus(result.status());
        payment.setProviderRefundId(result.refundId());
        payment.setRefundReason(request.getReason());
        payment.setRefundFailedReason(result.failureReason());
        if (result.status() == PaymentStatus.REFUNDED) payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        request.setReviewedBy(reviewerId);
        request.setReviewedAt(LocalDateTime.now());
        if (result.status() == PaymentStatus.REFUNDED) {
            request.setStatus(RefundRequestStatus.APPROVED);
            Booking booking = requireBooking(request.getBookingId());
            booking.setStatus(BookingStatus.CANCELLED);
            bookingService.releaseSeats(booking);
            bookingRepository.save(booking);
            notifyCustomer(request, "Hoàn tiền đã được duyệt", "Yêu cầu hoàn tiền vé " + request.getTicketCode() + " đã được xử lý thành công.");
        } else if (result.status() == PaymentStatus.REFUND_PENDING) {
            request.setStatus(RefundRequestStatus.REFUND_PENDING);
            notifyCustomer(request, "Đã duyệt, đang chờ hoàn tiền", "Cổng thanh toán đang xử lý yêu cầu hoàn tiền của bạn.");
        } else {
            request.setStatus(RefundRequestStatus.REFUND_FAILED);
            request.setRejectionReason(result.failureReason());
            notifyCustomer(request, "Hoàn tiền chưa thành công", "Hệ thống chưa thể hoàn tiền; bộ phận hỗ trợ sẽ tiếp tục xử lý.");
        }
        return toDto(refundRepository.save(request));
    }

    private RefundRequestDto reject(RefundRequest request, UUID reviewerId, String rawReason) {
        String reason = clean(rawReason);
        if (reason.length() < 5) throw new BadRequestException("Vui lòng nhập lý do từ chối");
        request.setStatus(RefundRequestStatus.REJECTED);
        request.setRejectionReason(reason);
        request.setReviewedBy(reviewerId);
        request.setReviewedAt(LocalDateTime.now());
        RefundRequest saved = refundRepository.save(request);
        notifyCustomer(saved, "Yêu cầu hoàn tiền bị từ chối", reason);
        return toDto(saved);
    }

    private void validateEligibility(RefundRequest request) {
        Booking booking = requireBooking(request.getBookingId());
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw new BadRequestException("Booking không còn ở trạng thái xác nhận");
        if (ticketRepository.findByBookingId(booking.getId()).stream().anyMatch(Ticket::isCheckedIn))
            throw new BadRequestException("Vé đã check-in nên không thể hoàn tiền");
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        if (showtime != null && !showtime.getStartTime().isAfter(LocalDateTime.now()))
            throw new BadRequestException("Suất chiếu đã bắt đầu nên không thể hoàn tiền");
    }

    private RefundRequest requireStatus(UUID id, RefundRequestStatus status) {
        RefundRequest request = refundRepository.findByIdForUpdate(id).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStatus() != status) throw new BadRequestException("Yêu cầu không ở trạng thái phù hợp để xử lý");
        return request;
    }

    private Booking requireBooking(UUID id) {
        return bookingRepository.findById(id).orElseThrow(() -> new BadRequestException("Không tìm thấy booking"));
    }

    private void requireShiftLeader(UUID staffId) {
        if (!profileRepository.findById(staffId).map(StaffEmploymentProfile::isShiftLeader).orElse(false))
            throw new BadRequestException("Chỉ staff trưởng được xử lý yêu cầu hoàn tiền");
    }

    private void notifyCustomer(RefundRequest request, String title, String message) {
        realtimeEventService.notifyUser(request.getCustomerId(), "REFUND_STATUS", title, message,
                "/my-bookings/" + request.getBookingId());
    }

    private void notifyShiftLeaders(String title, String message) {
        profileRepository.findAll().stream().filter(StaffEmploymentProfile::isShiftLeader)
                .forEach(profile -> realtimeEventService.notifyUser(profile.getStaffId(), "REFUND_REQUEST", title, message, "/staff/refunds"));
    }

    private void notifyAdmins(String title, String message) {
        userRepository.findAll().stream().filter(user -> user.getRole() == User.Role.ADMIN)
                .forEach(user -> realtimeEventService.notifyUser(user.getId(), "REFUND_APPROVAL", title, message, "/admin"));
    }

    private List<RefundRequestDto> enrich(List<RefundRequest> requests) {
        return requests.stream().map(this::toDto).toList();
    }

    private RefundRequestDto toDto(RefundRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        User customer = userRepository.findById(request.getCustomerId()).orElse(null);
        User staff = request.getStaffId() == null ? null : userRepository.findById(request.getStaffId()).orElse(null);
        Showtime showtime = booking == null ? null : showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);
        String refundQrImageUrl = request.getRefundQrMessageId() == null ? null
                : messageRepository.findById(request.getRefundQrMessageId()).map(RefundMessage::getImageUrl).orElse(null);
        return RefundRequestDto.builder().id(request.getId()).bookingId(request.getBookingId())
                .bookingCode(booking == null ? null : booking.getConfirmationCode()).ticketCode(request.getTicketCode())
                .customerId(request.getCustomerId()).customerName(customer == null ? null : customer.getFullName())
                .customerEmail(customer == null ? null : customer.getEmail()).staffId(request.getStaffId())
                .staffName(staff == null ? null : staff.getFullName()).movieTitle(movie == null ? null : movie.getTitle())
                .amount(request.getAmount()).reason(request.getReason()).rejectionReason(request.getRejectionReason())
                .refundQrImageUrl(refundQrImageUrl)
                .status(request.getStatus()).requiresAdmin(request.isRequiresAdmin())
                .ticketCheckedIn(ticketRepository.findByBookingId(request.getBookingId()).stream().anyMatch(Ticket::isCheckedIn))
                .showtimeStart(showtime == null ? null : showtime.getStartTime()).createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt()).reviewedAt(request.getReviewedAt()).build();
    }

    private void requireRefundQr(RefundRequest request) {
        boolean hasQr = request.getRefundQrMessageId() != null
                && messageRepository.findById(request.getRefundQrMessageId())
                .map(RefundMessage::getImageUrl)
                .filter(url -> !url.isBlank())
                .isPresent();
        if (!hasQr) {
            throw new BadRequestException("Yêu cầu từ 200.000đ cần ảnh QR nhận tiền của khách trước khi duyệt");
        }
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }
}
