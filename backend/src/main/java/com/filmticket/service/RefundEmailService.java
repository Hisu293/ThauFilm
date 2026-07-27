package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundEmailService {
    private final JavaMailSender mailSender;
    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final TheaterRepository theaterRepository;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String from;

    public void sendSuccess(User customer, Booking booking, Payment payment) {
        if (customer == null || customer.getEmail() == null || customer.getEmail().isBlank()) return;
        Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);
        String theater = showtime == null || showtime.getCinemaRoomId() == null ? "Phim online"
                : cinemaRoomRepository.findById(showtime.getCinemaRoomId()).map(CinemaRoom::getTheaterId)
                .flatMap(theaterRepository::findById).map(Theater::getName).orElse("Rạp chiếu phim");
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(customer.getEmail());
            helper.setSubject("ThauFilm - Hoàn tiền vé thành công");
            helper.setText("Xin chào " + (customer.getFullName() == null ? "bạn" : customer.getFullName()) + ",\n\n"
                    + "Yêu cầu hoàn tiền của bạn đã được xử lý thành công.\n"
                    + "Phim: " + (movie == null ? "Không xác định" : movie.getTitle()) + "\n"
                    + "Rạp: " + theater + "\n"
                    + "Suất chiếu: " + (showtime == null ? "Không xác định" : showtime.getStartTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))) + "\n"
                    + "Số tiền hoàn: " + payment.getAmount().toPlainString() + " đ\n"
                    + "Mã booking: " + booking.getConfirmationCode() + "\n"
                    + "Thời gian hoàn tiền: " + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + "\n\n"
                    + "Cảm ơn bạn đã sử dụng ThauFilm.");
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Gửi email hoàn tiền thất bại: bookingId={}, email={}", booking.getId(), customer.getEmail(), ex);
        }
    }
}
