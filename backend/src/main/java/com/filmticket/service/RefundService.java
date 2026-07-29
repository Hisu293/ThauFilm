package com.filmticket.service;

import com.filmticket.client.PayOSRefundClient;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final RefundHistoryRepository historyRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingService bookingService;
    private final PayOSRefundClient payOSRefundClient;
    private final RefundEmailService refundEmailService;
    private final AuditLogService auditLogService;

    @Value("${refund.window-hours:3}")
    private long refundWindowHours;

    @Transactional
    public RefundResult refundBooking(UUID bookingId, UUID requesterId, boolean admin,
                                     String bankBin, String accountNumber, String reason) {
        long startedAt = System.currentTimeMillis();
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy booking"));
        if (!admin && !booking.getUserId().equals(requesterId)) {
            throw new BadRequestException("Bạn không có quyền hoàn tiền booking này");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking phải ở trạng thái đã thanh toán hoặc đã xác nhận");
        }
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thanh toán của booking"));
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Thanh toán không ở trạng thái đã thanh toán hoặc đã hoàn tiền trước đó");
        }
        if (!"PAYOS".equalsIgnoreCase(payment.getProvider())) {
            throw new BadRequestException("Booking này không thanh toán qua PayOS");
        }
        if (historyRepository.existsByBookingIdAndStatusIn(bookingId,
                EnumSet.of(RefundHistoryStatus.PROCESSING, RefundHistoryStatus.SUCCEEDED))) {
            throw new BadRequestException("Booking đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tiền");
        }
        if (refundRequestRepository.findFirstByBookingIdAndStatusIn(bookingId,
                EnumSet.of(RefundRequestStatus.APPROVED, RefundRequestStatus.REFUND_PENDING)).isPresent()) {
            throw new BadRequestException("Booking đã được xử lý hoàn tiền trước đó");
        }
        validateShowtime(booking);
        if (bankBin == null || !bankBin.matches("\\d{6,10}")) {
            throw new BadRequestException("Mã BIN ngân hàng không hợp lệ");
        }
        if (accountNumber == null || !accountNumber.matches("\\d{5,20}")) {
            throw new BadRequestException("Số tài khoản ngân hàng không hợp lệ");
        }
        String safeReason = reason == null || reason.isBlank() ? "Khach hang huy ve" : reason.trim();
        String referenceId = "REFUND_" + booking.getId().toString().replace("-", "");
        PayOSRefundClient.PayoutResult payout = payOSRefundClient.refund(
                referenceId, payment.getAmount(), safeReason, bankBin.trim(), accountNumber.trim());
        if (!payout.succeeded() && !payout.processing()) {
            auditLogService.failure(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.REFUND_FAILED).targetType("PAYMENT")
                    .targetId(payment.getId().toString()).actorId(requesterId)
                    .description("Hoàn tiền qua PayOS thất bại").reason(safeReason)
                    .correlationId(bookingId.toString()).providerEventId(payout.payoutId())
                    .sensitive(true).metadata(Map.of("trạngTháiPayOS", String.valueOf(payout.state()))).build(),
                    new IllegalStateException("PayOS trả về trạng thái: " + payout.state()));
            throw new BadRequestException("PayOS hoàn tiền thất bại với trạng thái: " + payout.state());
        }
        RefundHistoryStatus historyStatus = payout.succeeded() ? RefundHistoryStatus.SUCCEEDED
                : payout.processing() ? RefundHistoryStatus.PROCESSING : RefundHistoryStatus.FAILED;
        historyRepository.save(RefundHistory.builder().bookingId(bookingId).paymentId(payment.getId())
                .refundAmount(payment.getAmount()).refundReason(safeReason).payosRefundId(payout.payoutId())
                .status(historyStatus).responseJson(payout.responseJson()).build());

        payment.setProviderRefundId(payout.payoutId());
        payment.setRefundReason(safeReason);
        payment.setRefundFailedReason(payout.succeeded() || payout.processing() ? null : "PayOS trả về trạng thái: " + payout.state());
        payment.setStatus(payout.succeeded() ? PaymentStatus.REFUNDED
                : payout.processing() ? PaymentStatus.REFUND_PENDING : PaymentStatus.REFUND_FAILED);
        if (payout.succeeded()) payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        if (payout.succeeded()) {
            booking.setStatus(BookingStatus.CANCELLED);
            bookingService.releaseSeats(booking);
            bookingRepository.save(booking);
            userRepository.findById(booking.getUserId()).ifPresent(user -> refundEmailService.sendSuccess(user, booking, payment));
        }
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(payout.succeeded() ? AuditAction.REFUND_SUCCEEDED : AuditAction.REFUND_REQUESTED)
                .targetType("PAYMENT").targetId(payment.getId().toString()).actorId(requesterId)
                .description(payout.succeeded()
                        ? "Hoàn tiền qua PayOS thành công"
                        : "Đã tạo yêu cầu hoàn tiền và đang chờ PayOS xử lý")
                .reason(safeReason).correlationId(bookingId.toString())
                .providerEventId(payout.payoutId()).sensitive(true)
                .newValues(Map.of("sốTiềnHoàn", payment.getAmount(), "trạngThái", payment.getStatus()))
                .metadata(Map.of("quảnTrịThựcHiện", admin)).build());
        log.info("Hoàn tiền tự động hoàn tất: mã đơn đặt vé={}, mã thanh toán={}, mã đơn hàng={}, số tiền hoàn={}, trạng thái={}, mã chi trả={}, thời gian={}ms",
                bookingId, payment.getId(), payment.getProviderCheckoutId(), payment.getAmount(), payment.getStatus(), payout.payoutId(), System.currentTimeMillis() - startedAt);
        return new RefundResult(payout.succeeded() || payout.processing(),
                payout.succeeded() ? "Hoàn tiền thành công"
                        : payout.processing() ? "Lệnh hoàn tiền đã được tạo, đang chờ PayOS xử lý"
                        : "PayOS không thể hoàn tiền với trạng thái: " + payout.state(),
                payment.getStatus().name(), payout.payoutId());
    }

    private void validateShowtime(Booking booking) {
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu"));
        LocalDateTime deadline = showtime.getStartTime().minusHours(refundWindowHours);
        if (!showtime.getStartTime().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Suất chiếu đã bắt đầu, không thể hoàn tiền");
        }
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new BadRequestException("Đã quá thời hạn hoàn tiền trước giờ chiếu " + refundWindowHours + " giờ");
        }
        if (ticketRepository.findByBookingId(booking.getId()).stream().anyMatch(Ticket::isCheckedIn)) {
            throw new BadRequestException("Vé đã check-in, không thể hoàn tiền");
        }
    }

    public record RefundResult(boolean success, String message, String status, String refundId) {}
}
