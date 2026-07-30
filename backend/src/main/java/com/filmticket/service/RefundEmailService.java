package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundEmailService {
    private final OutboundEmailService outboundEmailService;
    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final TheaterRepository theaterRepository;

    public void sendSuccess(User customer, Booking booking, Payment payment) {
        if (customer == null || customer.getEmail() == null || customer.getEmail().isBlank()) return;
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);
        String theater = showtime == null || showtime.getCinemaRoomId() == null ? "Phim online"
                : cinemaRoomRepository.findById(showtime.getCinemaRoomId()).map(CinemaRoom::getTheaterId)
                .flatMap(theaterRepository::findById).map(Theater::getName).orElse("Rạp chiếu phim");
        try {
            String body = "Xin chào " + (customer.getFullName() == null ? "bạn" : customer.getFullName()) + ",\n\n"
                    + "Yêu cầu hoàn tiền của bạn đã được xử lý thành công.\n"
                    + "Phim: " + (movie == null ? "Không xác định" : movie.getTitle()) + "\n"
                    + "Rạp: " + theater + "\n"
                    + "Suất chiếu: " + (showtime == null ? "Không xác định" : showtime.getStartTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))) + "\n"
                    + "Số tiền hoàn: " + payment.getAmount().toPlainString() + " đ\n"
                    + "Mã booking: " + booking.getConfirmationCode() + "\n"
                    + "Thời gian hoàn tiền: " + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + "\n\n"
                    + "Cảm ơn bạn đã sử dụng ThauFilm.";
            outboundEmailService.send(
                    "REFUND_SUCCEEDED_" + payment.getId(),
                    customer.getEmail(),
                    "ThauFilm - Hoàn tiền vé thành công",
                    body,
                    false,
                    List.of());
        } catch (Exception ex) {
            log.error("Gửi email hoàn tiền thất bại: mã đơn đặt vé={}, email={}", booking.getId(), customer.getEmail(), ex);
        }
    }
}
