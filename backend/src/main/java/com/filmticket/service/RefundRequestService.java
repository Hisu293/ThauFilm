package com.filmticket.service;

import com.filmticket.client.PayOSRefundClient;
import com.filmticket.dto.RefundRequestDto;
import com.filmticket.dto.RefundMessageDto;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final OnlineMovieViewRepository onlineMovieViewRepository;
    private final GroupBookingMemberRepository groupBookingMemberRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final PayOSRefundClient payOSRefundClient;
    private final RefundHistoryRepository refundHistoryRepository;
    private final BookingService bookingService;
    private final RealtimeEventService realtimeEventService;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final AuditLogService auditLogService;
    private final RefundEmailService refundEmailService;

    @Value("${refund.staff-approval-threshold:200000}")
    private BigDecimal staffApprovalThreshold;

    @Transactional
    public RefundRequestDto requestByCustomer(UUID customerId, UUID bookingId, String ticketCode, String reason,
                                              String refundMethod, String bankBin, String accountNumber) {
        Booking booking = requireBooking(bookingId);
        if (!booking.getUserId().equals(customerId)) throw new BadRequestException("Bạn không có quyền yêu cầu hoàn vé này");
        RefundMethod method = parseRefundMethod(refundMethod);
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán"));
        UUID paidByUserId = payment.getPaidByUserId() == null ? booking.getUserId() : payment.getPaidByUserId();
        if (method == RefundMethod.AUTOMATIC && !payOSRefundClient.isAvailable()) {
            throw new BadRequestException("Kênh chi PayOS/Bảo Kim chưa sẵn sàng, vui lòng chọn hoàn tiền thủ công");
        }
        boolean paidByAnotherUser = !paidByUserId.equals(customerId);
        if (!paidByAnotherUser) validateDestination(method, bankBin, accountNumber);
        RefundRequest request = createRequest(booking, null, ticketCode, reason,
                method, paidByAnotherUser ? null : bankBin, paidByAnotherUser ? null : accountNumber);
        saveMessage(request, customerId, "MEMBER", reason);
        if (!paidByUserId.equals(customerId)) {
            realtimeEventService.notifyUser(paidByUserId, "REFUND_REQUESTED", "Vé bạn thanh toán giúp đang yêu cầu hoàn",
                    method == RefundMethod.AUTOMATIC
                            ? "Vui lòng mở lịch sử hoàn tiền, nhập BIN và số tài khoản của bạn để xác nhận nhận tiền."
                            : "Vui lòng mở lịch sử hoàn tiền và cung cấp QR nhận tiền của bạn để Staff xác minh.",
                    "/my-refunds");
        }
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
        RefundRequest request = createRequest(requireBooking(bookingId), staffId, ticketCode, reason,
                RefundMethod.MANUAL, null, null);
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

    @Transactional
    public RefundRequestDto requestForCancelledGroupBooking(UUID bookingId, String reason) {
        Booking booking = requireBooking(bookingId);
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán của thành viên"));
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Thành viên chưa có khoản thanh toán cần hoàn");
        }
        Optional<RefundRequest> existing = refundRepository.findFirstByBookingIdAndStatusIn(bookingId, ACTIVE);
        if (existing.isPresent()) return toDto(existing.get());

        RefundRequest request = refundRepository.save(RefundRequest.builder()
                .bookingId(bookingId).paymentId(payment.getId()).customerId(booking.getUserId())
                .ticketCode("SYS-GROUP-" + bookingId.toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .amount(payment.getAmount()).refundMethod(RefundMethod.MANUAL)
                .reason(reason).ticketCheckedIn(false).requiresAdmin(true)
                .status(RefundRequestStatus.REQUESTED).build());
        saveMessage(request, booking.getUserId(), "SYSTEM", reason);
        notifyShiftLeaders("Nhóm đã hủy/hết hạn cần hoàn tiền",
                "Có khoản thanh toán " + payment.getAmount() + "đ đang chờ Staff Trưởng xác minh.");
        notifyCustomer(request, "Đã tạo yêu cầu hoàn tiền",
                "Yêu cầu đang chờ Staff Trưởng xác minh trước khi chuyển Admin duyệt.");
        return toDto(request);
    }

    @Transactional
    public RefundRequestDto requestForWatchParty(UUID customerId, UUID roomId, UUID bookingId, UUID paymentId,
                                                  String rawReason, String refundMethod,
                                                  String bankBin, String accountNumber) {
        String reason = clean(rawReason);
        if (reason.length() < 10) {
            throw new BadRequestException("Vui lòng mô tả sự cố ít nhất 10 ký tự");
        }
        RefundMethod method = parseRefundMethod(refundMethod);
        if (method == RefundMethod.AUTOMATIC && !payOSRefundClient.isAvailable())
            throw new BadRequestException("Kênh chi PayOS/Bảo Kim chưa sẵn sàng");
        validateDestination(method, bankBin, accountNumber);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán Watch Party"));
        Booking booking = requireBooking(bookingId);
        if (!booking.getUserId().equals(customerId) || !bookingId.equals(payment.getBookingId())) {
            throw new BadRequestException("Booking Watch Party không thuộc về tài khoản của bạn");
        }
        if (payment.getStatus() != PaymentStatus.PAID)
            throw new BadRequestException("Thanh toán Watch Party không đủ điều kiện hoàn");
        Optional<RefundRequest> existing = refundRepository.findFirstByBookingIdAndStatusIn(bookingId, ACTIVE);
        if (existing.isPresent()) return toDto(existing.get());
        RefundRequest request = refundRepository.save(RefundRequest.builder()
                .bookingId(bookingId).paymentId(paymentId).customerId(customerId)
                .ticketCode("SYS-WATCH-" + roomId.toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .amount(payment.getAmount()).refundMethod(method)
                .bankBin(method == RefundMethod.AUTOMATIC ? bankBin.trim() : null)
                .bankAccountNumber(method == RefundMethod.AUTOMATIC ? accountNumber.trim() : null)
                .payoutConfirmedBy(method == RefundMethod.AUTOMATIC ? customerId : null)
                .payoutConfirmedAt(method == RefundMethod.AUTOMATIC ? LocalDateTime.now() : null)
                .reason(reason)
                .ticketCheckedIn(false).requiresAdmin(true).status(RefundRequestStatus.REQUESTED).build());
        saveMessage(request, customerId, "MEMBER", request.getReason());
        notifyShiftLeaders("Watch Party cần hoàn tiền", "Yêu cầu đang chờ Staff Trưởng xác minh.");
        return toDto(request);
    }

    @Transactional(readOnly = true)
    public List<RefundRequestDto> customerRequests(UUID customerId) {
        return enrich(refundRepository.findVisibleToUser(customerId));
    }

    @Transactional
    public RefundRequestDto confirmAutomaticDestination(UUID userId, UUID requestId, String bankBin, String accountNumber) {
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.REQUESTED);
        if (!isAutomatic(request)) throw new BadRequestException("Yêu cầu này không sử dụng hoàn tiền tự động");
        UUID paidByUserId = refundRecipientId(request);
        if (!paidByUserId.equals(userId)) {
            throw new BadRequestException("Chỉ người thực tế thanh toán mới được xác nhận tài khoản nhận tiền");
        }
        validateDestination(RefundMethod.AUTOMATIC, bankBin, accountNumber);
        request.setBankBin(bankBin.trim());
        request.setBankAccountNumber(accountNumber.trim());
        request.setPayoutConfirmedBy(userId);
        request.setPayoutConfirmedAt(LocalDateTime.now());
        RefundRequest saved = refundRepository.save(request);
        saveMessage(saved, userId, "MEMBER", "Tôi đã xác nhận tài khoản nhận hoàn tiền tự động.");
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.REFUND_DESTINATION_CONFIRMED).targetType("REFUND_REQUEST")
                .targetId(saved.getId().toString()).actorId(userId)
                .description("Người thanh toán đã xác nhận tài khoản nhận hoàn tiền tự động")
                .correlationId(saved.getBookingId().toString())
                .metadata(Map.of("mãBIN", saved.getBankBin(), "tàiKhoản", maskAccount(saved.getBankAccountNumber())))
                .sensitive(true).build());
        notifyShiftLeaders("Người thanh toán đã xác nhận tài khoản hoàn tiền",
                "Yêu cầu " + saved.getTicketCode() + " đã đủ thông tin để Staff trưởng kiểm tra.");
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<RefundRequestDto> staffRequests(UUID staffId, RefundRequestStatus status, Pageable pageable) {
        requireShiftLeader(staffId);
        return refundPage(status, pageable);
    }

    @Transactional(readOnly = true)
    public Page<RefundRequestDto> adminRequests(RefundRequestStatus status, Pageable pageable) {
        return refundPage(status, pageable);
    }

    private Page<RefundRequestDto> refundPage(RefundRequestStatus status, Pageable pageable) {
        Page<RefundRequest> requests = status == null
                ? refundRepository.findAllByOrderByCreatedAtDesc(pageable)
                : refundRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return requests.map(this::toListDto);
    }

    @Transactional(readOnly = true)
    public RefundRequestDto staffRequest(UUID staffId, UUID requestId) {
        requireShiftLeader(staffId);
        return toDto(requireRequest(requestId));
    }

    @Transactional(readOnly = true)
    public RefundRequestDto adminRequest(UUID requestId) {
        return toDto(requireRequest(requestId));
    }

    @Transactional
    public RefundRequestDto staffApprove(UUID staffId, UUID requestId) {
        requireShiftLeader(staffId);
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.REQUESTED);
        validateEligibility(request);
        if (isAutomatic(request)) requireAutomaticDestination(request);
        if (request.getAmount().compareTo(staffApprovalThreshold) >= 0 && !isAutomatic(request)) {
            requireRefundQr(request);
        }
        request.setStaffId(staffId);
        request.setReviewedBy(staffId);
        request.setReviewedAt(LocalDateTime.now());
        request.setRequiresAdmin(true);
        request.setStatus(RefundRequestStatus.PENDING_APPROVAL);
        RefundRequest saved = refundRepository.save(request);
            notifyAdmins("Yêu cầu hoàn tiền chờ duyệt", "Yêu cầu " + saved.getTicketCode() + " trị giá " + saved.getAmount() + "đ cần Admin duyệt");
            notifyCustomer(saved, "Yêu cầu đang chờ Admin duyệt", "Staff trưởng đã kiểm tra và chuyển yêu cầu hoàn tiền lên Admin.");
        return toDto(saved);
    }

    @Transactional
    public RefundRequestDto adminApprove(UUID adminId, UUID requestId) {
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.PENDING_APPROVAL);
        validateEligibility(request);
        if (isAutomatic(request)) requireAutomaticDestination(request);
        if (!isAutomatic(request)) requireRefundQr(request);
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

    @Transactional
    public RefundRequestDto retryAutomaticRefund(UUID adminId, UUID requestId) {
        RefundRequest request = requireStatus(requestId, RefundRequestStatus.REFUND_PENDING);
        if (!isAutomatic(request)) {
            throw new BadRequestException("Chỉ yêu cầu hoàn tiền tự động mới có thể thử lại qua PayOS");
        }
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán"));
        if (payment.getStatus() != PaymentStatus.REFUND_PENDING) {
            throw new BadRequestException("Thanh toán không ở trạng thái chờ hoàn tiền");
        }
        if (payment.getProviderRefundId() != null && !payment.getProviderRefundId().isBlank()) {
            throw new BadRequestException("Lệnh chi đã có trên PayOS; hệ thống sẽ tiếp tục đối soát thay vì tạo lại");
        }
        validateEligibility(request);
        requireAutomaticDestination(request);

        PaymentGatewayService.GatewayRefund result = executeAutomaticRefund(request, payment);
        payment.setStatus(result.status());
        payment.setProviderRefundId(result.refundId());
        payment.setRefundReason(request.getReason());
        payment.setRefundFailedReason(result.failureReason());
        if (result.status() == PaymentStatus.REFUNDED) payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(result.failureReason());
        if (result.status() == PaymentStatus.REFUNDED) {
            request.setStatus(RefundRequestStatus.APPROVED);
            Booking booking = requireBooking(request.getBookingId());
            booking.setStatus(BookingStatus.CANCELLED);
            bookingService.releaseSeats(booking);
            bookingRepository.save(booking);
            notifyCustomer(request, "Hoàn tiền thành công",
                    "PayOS/Bảo Kim đã hoàn tiền cho vé " + request.getTicketCode() + ".");
        } else {
            request.setStatus(RefundRequestStatus.REFUND_PENDING);
            if (result.failureReason() == null) {
                notifyCustomer(request, "Đang xử lý hoàn tiền",
                        "PayOS/Bảo Kim đã tiếp nhận lệnh chi và đang xử lý.");
            }
        }
        return toDto(refundRepository.save(request));
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
        UUID refundRecipientId = refundRecipientId(request);
        if (!refundRecipientId.equals(customerId)) {
            throw new BadRequestException("Chỉ người thực tế thanh toán mới được cung cấp QR nhận tiền cho yêu cầu này");
        }
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

    private RefundRequest createRequest(Booking booking, UUID staffId, String rawTicketCode, String rawReason,
                                        RefundMethod refundMethod, String bankBin, String accountNumber) {
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw new BadRequestException("Chỉ vé đã thanh toán và xác nhận mới được yêu cầu hoàn");
        Payment payment = paymentRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán"));
        if (payment.getStatus() != PaymentStatus.PAID) throw new BadRequestException("Thanh toán không ở trạng thái đã trả tiền");
        refundRepository.findFirstByBookingIdAndStatusIn(booking.getId(), ACTIVE).ifPresent(existing -> {
            throw new BadRequestException("Booking đã có một yêu cầu hoàn tiền đang xử lý");
        });
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        boolean onlineBooking = showtime != null && showtime.isOnline();
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        if (tickets.isEmpty() && !onlineBooking) throw new BadRequestException("Booking chưa có vé");
        String ticketCode = clean(rawTicketCode);
        String resolvedTicketCode;
        if (tickets.isEmpty()) {
            resolvedTicketCode = "SYS-ONLINE-" + booking.getId().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } else {
            Ticket selected = ticketCode.isEmpty() ? tickets.get(0) : tickets.stream()
                    .filter(ticket -> ticket.getTicketCode().equalsIgnoreCase(ticketCode)).findFirst()
                    .orElseThrow(() -> new BadRequestException("Mã vé không thuộc booking này"));
            resolvedTicketCode = selected.getTicketCode();
        }
        String reason = clean(rawReason);
        if (reason.length() < 10) throw new BadRequestException("Lý do hoàn tiền cần ít nhất 10 ký tự");
        boolean checkedIn = tickets.stream().anyMatch(Ticket::isCheckedIn);
        return refundRepository.save(RefundRequest.builder()
                .bookingId(booking.getId()).paymentId(payment.getId()).customerId(booking.getUserId())
                .staffId(staffId).ticketCode(resolvedTicketCode).amount(payment.getAmount())
                .refundMethod(refundMethod)
                .bankBin(refundMethod == RefundMethod.AUTOMATIC && bankBin != null ? bankBin.trim() : null)
                .bankAccountNumber(refundMethod == RefundMethod.AUTOMATIC && accountNumber != null ? accountNumber.trim() : null)
                .payoutConfirmedBy(refundMethod == RefundMethod.AUTOMATIC && bankBin != null
                        ? (payment.getPaidByUserId() == null ? booking.getUserId() : payment.getPaidByUserId()) : null)
                .payoutConfirmedAt(refundMethod == RefundMethod.AUTOMATIC && bankBin != null ? LocalDateTime.now() : null)
                .reason(reason).ticketCheckedIn(checkedIn)
                .requiresAdmin(onlineBooking || payment.getAmount().compareTo(staffApprovalThreshold) >= 0)
                .status(RefundRequestStatus.REQUESTED).build());
    }

    private RefundRequest requireOwnedRequest(UUID customerId, UUID requestId) {
        RefundRequest request = refundRepository.findById(requestId).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        if (!request.getCustomerId().equals(customerId) && !refundRecipientId(request).equals(customerId)) {
            throw new BadRequestException("Bạn không có quyền xem trao đổi này");
        }
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
        PaymentGatewayService.GatewayRefund result = isAutomatic(request)
                ? executeAutomaticRefund(request, payment)
                : paymentGatewayService.refund(payment, request.getReason());
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
            userRepository.findById(booking.getUserId())
                    .ifPresent(customer -> refundEmailService.sendSuccess(customer, booking, payment));
            notifyCustomer(request, "Hoàn tiền đã được duyệt", "Yêu cầu hoàn tiền vé " + request.getTicketCode() + " đã được xử lý thành công.");
        } else if (result.status() == PaymentStatus.REFUND_PENDING) {
            request.setStatus(RefundRequestStatus.REFUND_PENDING);
            request.setRejectionReason(result.failureReason());
            notifyCustomer(request, "Đã duyệt, đang chờ hoàn tiền",
                    result.failureReason() == null
                            ? "Cổng thanh toán đang xử lý yêu cầu hoàn tiền của bạn."
                            : "Chi tự động chưa thành công; yêu cầu đã được chuyển sang xử lý thủ công.");
        } else {
            request.setStatus(RefundRequestStatus.REFUND_FAILED);
            request.setRejectionReason(result.failureReason());
            Booking booking = requireBooking(request.getBookingId());
            userRepository.findById(booking.getUserId())
                    .ifPresent(customer -> refundEmailService.sendFailure(
                            customer, booking, payment, result.failureReason()));
            notifyCustomer(request, "Hoàn tiền chưa thành công", "Hệ thống chưa thể hoàn tiền; bộ phận hỗ trợ sẽ tiếp tục xử lý.");
        }
        return toDto(refundRepository.save(request));
    }

    private PaymentGatewayService.GatewayRefund executeAutomaticRefund(RefundRequest request, Payment payment) {
        int attempt = request.getAutomaticAttemptCount() + 1;
        request.setAutomaticAttemptCount(attempt);
        String referenceId = "REFUND_REQUEST_" + request.getId().toString().replace("-", "")
                + "_A" + attempt;
        try {
            PayOSRefundClient.PayoutResult payout = payOSRefundClient.refund(
                    referenceId, payment.getAmount(), request.getReason(),
                    request.getBankBin(), request.getBankAccountNumber());
            RefundHistoryStatus historyStatus = payout.succeeded()
                    ? RefundHistoryStatus.SUCCEEDED
                    : payout.processing() ? RefundHistoryStatus.PROCESSING : RefundHistoryStatus.FAILED;
            refundHistoryRepository.save(RefundHistory.builder()
                    .bookingId(request.getBookingId())
                    .paymentId(payment.getId())
                    .refundAmount(payment.getAmount())
                    .refundReason(request.getReason())
                    .payosRefundId(payout.payoutId())
                    .status(historyStatus)
                    .responseJson(payout.responseJson())
                    .build());
            if (payout.succeeded()) {
                return new PaymentGatewayService.GatewayRefund(
                        payout.payoutId(), PaymentStatus.REFUNDED, null);
            }
            if (payout.processing()) {
                return new PaymentGatewayService.GatewayRefund(
                        payout.payoutId(), PaymentStatus.REFUND_PENDING, null);
            }
            return manualFallback("PayOS/Bảo Kim trả về trạng thái " + payout.state());
        } catch (RuntimeException ex) {
            return manualFallback(ex.getMessage());
        }
    }

    private PaymentGatewayService.GatewayRefund manualFallback(String automaticFailure) {
        String detail = clean(automaticFailure);
        return new PaymentGatewayService.GatewayRefund(null, PaymentStatus.REFUND_PENDING,
                "Chi tự động không thành công"
                        + (detail.isEmpty() ? "" : ": " + detail)
                        + ". Đã chuyển sang chờ hoàn tiền thủ công.");
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
        boolean cancelledGroupRefund = request.getTicketCode() != null
                && request.getTicketCode().startsWith("SYS-GROUP-")
                && List.of(BookingStatus.EXPIRED, BookingStatus.CANCELLED).contains(booking.getStatus());
        if (cancelledGroupRefund) return;
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw new BadRequestException("Booking không còn ở trạng thái xác nhận");
    }

    private RefundRequest requireStatus(UUID id, RefundRequestStatus status) {
        RefundRequest request = refundRepository.findByIdForUpdate(id).orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
        if (request.getStatus() != status) throw new BadRequestException("Yêu cầu không ở trạng thái phù hợp để xử lý");
        return request;
    }

    private RefundRequest requireRequest(UUID id) {
        return refundRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy yêu cầu hoàn tiền"));
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
        UUID paidByUserId = refundRecipientId(request);
        if (!paidByUserId.equals(request.getCustomerId())) {
            realtimeEventService.notifyUser(paidByUserId, "REFUND_STATUS", title, message, "/my-refunds");
        }
    }

    private void notifyShiftLeaders(String title, String message) {
        profileRepository.findAll().stream().filter(StaffEmploymentProfile::isShiftLeader)
                .forEach(profile -> realtimeEventService.notifyUser(profile.getStaffId(), "REFUND_REQUEST", title, message, "/staff/refunds"));
    }

    private void notifyAdmins(String title, String message) {
        userRepository.findAll().stream().filter(user -> user.getRole() == User.Role.ADMIN)
                .forEach(user -> realtimeEventService.notifyUser(user.getId(), "REFUND_APPROVAL", title, message,
                        "/admin?view=refunds"));
    }

    private List<RefundRequestDto> enrich(List<RefundRequest> requests) {
        return requests.stream().map(this::toDto).toList();
    }

    private RefundRequestDto toDto(RefundRequest request) {
        return toDto(request, true);
    }

    private RefundRequestDto toListDto(RefundRequest request) {
        return toDto(request, false);
    }

    private RefundRequestDto toDto(RefundRequest request, boolean includeEvidence) {
        Booking booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        User customer = userRepository.findById(request.getCustomerId()).orElse(null);
        User staff = request.getStaffId() == null ? null : userRepository.findById(request.getStaffId()).orElse(null);
        Showtime showtime = booking == null ? null : showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);
        String refundQrImageUrl = request.getRefundQrMessageId() == null ? null
                : messageRepository.findById(request.getRefundQrMessageId()).map(RefundMessage::getImageUrl).orElse(null);
        Payment refundPayment = paymentRepository.findById(request.getPaymentId()).orElse(null);
        UUID paidByUserId = refundPayment == null || refundPayment.getPaidByUserId() == null
                ? request.getCustomerId() : refundPayment.getPaidByUserId();
        User paidByUser = userRepository.findById(paidByUserId).orElse(null);
        OnlineMovieView firstView = includeEvidence ? onlineMovieViewRepository
                .findFirstByBookingIdOrderByViewedAtAsc(request.getBookingId()).orElse(null) : null;
        LocalDateTime now = LocalDateTime.now();
        boolean ticketCheckedIn = includeEvidence
                && ticketRepository.findByBookingId(request.getBookingId()).stream().anyMatch(Ticket::isCheckedIn);
        boolean showtimeStarted = showtime != null && !now.isBefore(showtime.getStartTime());
        boolean showtimeEnded = showtime != null && !now.isBefore(showtime.getEndTime());
        String showtimePhase = showtime == null ? "UNKNOWN"
                : showtimeEnded ? "ENDED" : showtimeStarted ? "IN_PROGRESS" : "NOT_STARTED";
        String ticketCode = request.getTicketCode() == null ? "" : request.getTicketCode();
        String bookingType = ticketCode.startsWith("SYS-WATCH-") ? "WATCH_PARTY"
                : ticketCode.startsWith("SYS-GROUP-") || (includeEvidence && booking != null && groupBookingMemberRepository.existsByBookingId(booking.getId()))
                ? "GROUP_BOOKING"
                : showtime != null && showtime.isOnline() ? "ONLINE" : "CINEMA";
        List<String> reviewWarnings = new ArrayList<>();
        if (ticketCheckedIn) reviewWarnings.add("Vé đã được check-in tại rạp.");
        if (firstView != null) reviewWarnings.add("Nội dung phim đã được mở lúc " + firstView.getViewedAt() + ".");
        if (showtimeEnded) reviewWarnings.add("Suất chiếu đã kết thúc.");
        else if (showtimeStarted) reviewWarnings.add("Suất chiếu đã bắt đầu hoặc đang diễn ra.");
        boolean automaticRetryAvailable = isAutomatic(request)
                && request.getStatus() == RefundRequestStatus.REFUND_PENDING
                && refundPayment != null
                && refundPayment.getStatus() == PaymentStatus.REFUND_PENDING
                && (refundPayment.getProviderRefundId() == null
                    || refundPayment.getProviderRefundId().isBlank());
        return RefundRequestDto.builder().id(request.getId()).bookingId(request.getBookingId())
                .bookingCode(booking == null ? null : booking.getConfirmationCode()).ticketCode(request.getTicketCode())
                .customerId(request.getCustomerId()).customerName(customer == null ? null : customer.getFullName())
                .customerEmail(customer == null ? null : customer.getEmail())
                .paidByUserId(paidByUserId).paidByUserName(paidByUser == null ? null : paidByUser.getFullName())
                .paidByUserEmail(paidByUser == null ? null : paidByUser.getEmail())
                .paidByAnotherUser(!paidByUserId.equals(request.getCustomerId())).staffId(request.getStaffId())
                .staffName(staff == null ? null : staff.getFullName()).movieTitle(movie == null ? null : movie.getTitle())
                .bookingType(bookingType)
                .amount(request.getAmount()).reason(request.getReason()).rejectionReason(request.getRejectionReason())
                .refundQrImageUrl(refundQrImageUrl)
                .refundMethod(request.getRefundMethod())
                .bankBin(request.getBankBin())
                .bankAccountNumber(null)
                .bankAccountMasked(maskAccount(request.getBankAccountNumber()))
                .payoutConfirmedBy(request.getPayoutConfirmedBy()).payoutConfirmedAt(request.getPayoutConfirmedAt())
                .payoutDestinationConfirmed(request.getPayoutConfirmedBy() != null
                        && request.getPayoutConfirmedAt() != null
                        && request.getBankBin() != null && request.getBankAccountNumber() != null)
                .automaticRetryAvailable(automaticRetryAvailable)
                .status(request.getStatus()).requiresAdmin(request.isRequiresAdmin())
                .ticketCheckedIn(ticketCheckedIn)
                .showtimeStart(showtime == null ? null : showtime.getStartTime())
                .showtimeEnd(showtime == null ? null : showtime.getEndTime())
                .showtimeStarted(showtimeStarted)
                .showtimeEnded(showtimeEnded)
                .showtimePhase(showtimePhase)
                .contentAccessed(firstView != null)
                .firstViewedAt(firstView == null ? null : firstView.getViewedAt())
                .reviewWarnings(reviewWarnings)
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt()).reviewedAt(request.getReviewedAt()).build();
    }

    private void requireRefundQr(RefundRequest request) {
        UUID refundRecipientId = refundRecipientId(request);
        boolean hasQr = request.getRefundQrMessageId() != null
                && messageRepository.findById(request.getRefundQrMessageId())
                .filter(message -> refundRecipientId.equals(message.getSenderId()))
                .map(RefundMessage::getImageUrl)
                .filter(url -> !url.isBlank())
                .isPresent();
        if (!hasQr) {
            throw new BadRequestException("Cần ảnh QR nhận tiền do chính người thanh toán cung cấp trước khi duyệt");
        }
    }

    private void requireAutomaticDestination(RefundRequest request) {
        if (request.getPayoutConfirmedBy() == null || request.getPayoutConfirmedAt() == null
                || request.getBankBin() == null || request.getBankAccountNumber() == null
                || !refundRecipientId(request).equals(request.getPayoutConfirmedBy())) {
            throw new BadRequestException("Người thanh toán chưa xác nhận BIN và số tài khoản nhận hoàn tiền");
        }
        validateDestination(RefundMethod.AUTOMATIC, request.getBankBin(), request.getBankAccountNumber());
    }

    private UUID refundRecipientId(RefundRequest request) {
        Payment payment = paymentRepository.findById(request.getPaymentId()).orElse(null);
        return payment == null || payment.getPaidByUserId() == null
                ? request.getCustomerId()
                : payment.getPaidByUserId();
    }

    private RefundMethod parseRefundMethod(String value) {
        if (value == null || value.isBlank()) return RefundMethod.MANUAL;
        try {
            return RefundMethod.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Phương thức hoàn tiền không hợp lệ");
        }
    }

    private void validateDestination(RefundMethod method, String bankBin, String accountNumber) {
        if (method != RefundMethod.AUTOMATIC) return;
        if (bankBin == null || !bankBin.matches("\\d{6,10}")) {
            throw new BadRequestException("Mã BIN ngân hàng không hợp lệ");
        }
        if (accountNumber == null || !accountNumber.matches("\\d{5,20}")) {
            throw new BadRequestException("Số tài khoản ngân hàng không hợp lệ");
        }
    }

    private boolean isAutomatic(RefundRequest request) {
        return request.getRefundMethod() == RefundMethod.AUTOMATIC;
    }

    private String maskAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return null;
        int visible = Math.min(4, accountNumber.length());
        return "*".repeat(accountNumber.length() - visible)
                + accountNumber.substring(accountNumber.length() - visible);
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }
}
