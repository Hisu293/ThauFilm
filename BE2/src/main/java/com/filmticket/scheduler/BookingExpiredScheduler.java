package com.filmticket.scheduler;

import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.BookingSeat;
import com.filmticket.model.SeatBookingStatus;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.BookingSeatRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.GroupBookingMemberRepository;
import com.filmticket.service.GroupBookingService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Component
@Lazy
@RequiredArgsConstructor
public class BookingExpiredScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingExpiredScheduler.class);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatAvailabilityRepository seatAvailabilityRepository;
    private final GroupBookingMemberRepository groupBookingMemberRepository;
    private final GroupBookingService groupBookingService;

    @Scheduled(fixedRate = 60000, initialDelay = 30000)
    @Transactional
    public void releaseExpiredBookings() {
        groupBookingService.expireDue();
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        List<Booking> expiredBookings = bookingRepository.findExpiredHolds(BookingStatus.HOLD, now);

        if (expiredBookings.isEmpty()) {
            return;
        }

        log.info("Found {} expired bookings to process", expiredBookings.size());

        for (Booking booking : expiredBookings) {
            try {
                if (groupBookingMemberRepository.existsByBookingId(booking.getId())) {
                    continue;
                }
                releaseSeats(booking);
                booking.setStatus(BookingStatus.EXPIRED);
                bookingRepository.save(booking);
                List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());
                log.info("Expired booking {} and released {} seats",
                        booking.getId(), seats.size());
            } catch (Exception e) {
                log.error("Failed to expire booking {}: {}", booking.getId(), e.getMessage());
            }
        }
    }

    private void releaseSeats(Booking booking) {
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat bs : bookingSeats) {
            seatAvailabilityRepository
                    .findByShowtimeIdAndSeatId(booking.getShowtimeId(), bs.getSeatId())
                    .ifPresent(av -> {
                        av.setStatus(SeatBookingStatus.AVAILABLE);
                        seatAvailabilityRepository.save(av);
                    });
        }
    }
}
