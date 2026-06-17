package com.filmticket.service;

import com.filmticket.dto.BookingResponse;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffBookingService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;

    public List<BookingResponse> listBookings() {
        return bookingRepository.findAll().stream()
                .map(booking -> BookingResponse.fromBooking(booking, List.of()))
                .toList();
    }

    public BookingResponse getBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        return BookingResponse.fromBooking(booking, List.of());
    }

    public Object checkPayment(UUID bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException("Payment not found"));
    }

    public Object checkAccess(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .toList();
    }

    @Transactional
    public Object regrantAccess(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() != BookingStatus.EXPIRED && booking.getStatus() != BookingStatus.CANCELLED) {
            throw new BadRequestException("Can only regrant access for EXPIRED or CANCELLED bookings");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        return BookingResponse.fromBooking(booking, List.of());
    }

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() == BookingStatus.HOLD) {
            bookingService.releaseSeats(booking);
            booking.setStatus(BookingStatus.CANCELLED);
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CANCELLED);
        } else if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Cannot cancel an already expired booking");
        } else {
            throw new BadRequestException("Booking is already cancelled");
        }

        bookingRepository.save(booking);
        return BookingResponse.fromBooking(booking, List.of());
    }

    @Transactional
    public BookingResponse refund(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BadRequestException("Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Can only refund CONFIRMED bookings");
        }

        paymentRepository.findByBookingId(bookingId).ifPresent(payment -> {
            payment.setStatus(com.filmticket.entity.PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        });

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        return BookingResponse.fromBooking(booking, List.of());
    }
}
