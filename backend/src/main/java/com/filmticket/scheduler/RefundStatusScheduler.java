package com.filmticket.scheduler;

import com.filmticket.client.PayOSRefundClient;
import com.filmticket.entity.*;
import com.filmticket.repository.*;
import com.filmticket.service.BookingService;
import com.filmticket.service.RefundEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefundStatusScheduler {
    private final RefundHistoryRepository historyRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PayOSRefundClient payOSRefundClient;
    private final BookingService bookingService;
    private final RefundEmailService refundEmailService;

    @Transactional
    @Scheduled(fixedDelayString = "${refund.status-poll-delay-ms:60000}", initialDelayString = "${refund.status-poll-initial-delay-ms:30000}")
    public void poll() {
        historyRepository.findByStatus(RefundHistoryStatus.PROCESSING).forEach(this::pollOne);
    }

    @Transactional
    public void pollOne(RefundHistory history) {
        try {
            PayOSRefundClient.PayoutResult payout = payOSRefundClient.getStatus(history.getPayosRefundId());
            history.setResponseJson(payout.responseJson());
            if (payout.succeeded()) {
                Booking booking = bookingRepository.findByIdForUpdate(history.getBookingId()).orElse(null);
                Payment payment = paymentRepository.findById(history.getPaymentId()).orElse(null);
                if (booking == null || payment == null || payment.getStatus() == PaymentStatus.REFUNDED) {
                    history.setStatus(RefundHistoryStatus.SUCCEEDED);
                    historyRepository.save(history);
                    return;
                }
                payment.setStatus(PaymentStatus.REFUNDED);
                payment.setRefundedAt(LocalDateTime.now());
                paymentRepository.save(payment);
                booking.setStatus(BookingStatus.CANCELLED);
                bookingService.releaseSeats(booking);
                bookingRepository.save(booking);
                userRepository.findById(booking.getUserId()).ifPresent(user -> refundEmailService.sendSuccess(user, booking, payment));
                history.setStatus(RefundHistoryStatus.SUCCEEDED);
                historyRepository.save(history);
                log.info("PayOS đã hoàn tiền thành công sau khi chờ: bookingId={}, paymentId={}, payoutId={}",
                        booking.getId(), payment.getId(), history.getPayosRefundId());
            } else if (!payout.processing()) {
                Payment payment = paymentRepository.findById(history.getPaymentId()).orElse(null);
                if (payment != null) {
                    payment.setStatus(PaymentStatus.REFUND_FAILED);
                    payment.setRefundFailedReason("PayOS trả về trạng thái: " + payout.state());
                    paymentRepository.save(payment);
                }
                history.setStatus(RefundHistoryStatus.FAILED);
                historyRepository.save(history);
                log.error("PayOS hoàn tiền thất bại sau khi kiểm tra: bookingId={}, payoutId={}, trạng thái={}",
                        history.getBookingId(), history.getPayosRefundId(), payout.state());
            }
        } catch (Exception ex) {
            log.error("Lỗi kiểm tra hoàn tiền PayOS: bookingId={}, payoutId={}, lỗi={}",
                    history.getBookingId(), history.getPayosRefundId(), ex.getMessage(), ex);
        }
    }
}
