package com.filmticket.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class BookingConfirmedEmailListener {

    private final BookingService bookingService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendTicketEmail(BookingConfirmedEvent event) {
        bookingService.sendConfirmedBookingEmail(
                event.bookingId(), event.discountAmount(), event.finalAmount());
    }
}
