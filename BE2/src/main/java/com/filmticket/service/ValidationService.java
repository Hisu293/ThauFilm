package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ValidationService {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TheaterRepository theaterRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final DiscountRepository discountRepository;

    public User validateUserExists(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    public Movie validateMovieExists(UUID movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Movie not found: " + movieId));
    }

    public Theater validateTheaterExists(UUID theaterId) {
        return theaterRepository.findById(theaterId)
                .orElseThrow(() -> new IllegalArgumentException("Theater not found: " + theaterId));
    }

    public CinemaRoom validateCinemaRoomExists(UUID cinemaRoomId) {
        return cinemaRoomRepository.findById(cinemaRoomId)
                .orElseThrow(() -> new IllegalArgumentException("CinemaRoom not found: " + cinemaRoomId));
    }

    public Seat validateSeatExists(UUID seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found: " + seatId));
    }

    public Showtime validateShowtimeExists(UUID showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + showtimeId));
    }

    public Booking validateBookingExists(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
    }

    public Discount validateDiscountExists(UUID discountId) {
        return discountRepository.findById(discountId)
                .orElseThrow(() -> new IllegalArgumentException("Discount not found: " + discountId));
    }

    public Discount validateDiscountCode(String code) {
        return discountRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Discount code not found: " + code));
    }

    public void validateCinemaRoomBelongsToTheater(UUID cinemaRoomId, UUID theaterId) {
        CinemaRoom room = validateCinemaRoomExists(cinemaRoomId);
        if (room.getTheaterId() == null || !room.getTheaterId().equals(theaterId)) {
            throw new IllegalArgumentException("CinemaRoom does not belong to Theater");
        }
    }

    public void validateSeatBelongsToCinemaRoom(UUID seatId, UUID cinemaRoomId) {
        Seat seat = validateSeatExists(seatId);
        if (!seat.getCinemaRoomId().equals(cinemaRoomId)) {
            throw new IllegalArgumentException("Seat does not belong to CinemaRoom");
        }
    }

    public void validateShowtimeBelongsToMovie(UUID showtimeId, UUID movieId) {
        Showtime showtime = validateShowtimeExists(showtimeId);
        if (!showtime.getMovieId().equals(movieId)) {
            throw new IllegalArgumentException("Showtime does not belong to Movie");
        }
    }

    public void validateShowtimeBelongsToCinemaRoom(UUID showtimeId, UUID cinemaRoomId) {
        Showtime showtime = validateShowtimeExists(showtimeId);
        if (!showtime.getCinemaRoomId().equals(cinemaRoomId)) {
            throw new IllegalArgumentException("Showtime does not belong to CinemaRoom");
        }
    }

    public void validateBookingBelongsToUser(UUID bookingId, UUID userId) {
        Booking booking = validateBookingExists(bookingId);
        if (!booking.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Booking does not belong to User");
        }
    }

    public void validateBookingBelongsToShowtime(UUID bookingId, UUID showtimeId) {
        Booking booking = validateBookingExists(bookingId);
        if (!booking.getShowtimeId().equals(showtimeId)) {
            throw new IllegalArgumentException("Booking does not belong to Showtime");
        }
    }
}
