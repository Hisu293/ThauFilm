package com.filmticket.service;

import com.filmticket.entity.EmailOtp;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.EmailOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailOtpService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TTL_MINUTES = 10;
    private static final int RESEND_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private final EmailOtpRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final OutboundEmailService outboundEmailService;

    @Transactional
    public void sendRegistrationOtp(String email) {
        send(email, EmailOtp.Purpose.VERIFY_REGISTRATION);
    }

    @Transactional
    public void sendPasswordResetOtp(String email) {
        send(email, EmailOtp.Purpose.RESET_PASSWORD);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = BadRequestException.class)
    public void verifyRegistrationOtp(String email, String code) {
        verify(email, EmailOtp.Purpose.VERIFY_REGISTRATION, code);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = BadRequestException.class)
    public void verifyPasswordResetOtp(String email, String code) {
        verify(email, EmailOtp.Purpose.RESET_PASSWORD, code);
    }

    private void send(String email, EmailOtp.Purpose purpose) {
        LocalDateTime now = LocalDateTime.now();
        EmailOtp otp = repository.findByEmailAndPurpose(email, purpose).orElse(null);
        if (otp != null && otp.getLastSentAt().plusSeconds(RESEND_SECONDS).isAfter(now)) {
            throw new BadRequestException("Vui lòng chờ 60 giây trước khi gửi lại OTP");
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        if (otp == null) {
            otp = EmailOtp.builder().email(email).purpose(purpose).createdAt(now).build();
        }
        otp.setCodeHash(passwordEncoder.encode(code));
        otp.setExpiresAt(now.plusMinutes(TTL_MINUTES));
        otp.setLastSentAt(now);
        otp.setAttempts(0);
        repository.save(otp);

        String subject = purpose == EmailOtp.Purpose.VERIFY_REGISTRATION
                ? "Mã xác minh tài khoản ThauFilm" : "Mã đặt lại mật khẩu ThauFilm";
        String action = purpose == EmailOtp.Purpose.VERIFY_REGISTRATION
                ? "xác minh tài khoản" : "đặt lại mật khẩu";
        String body = "<h2>ThauFilm</h2><p>Mã OTP để " + action + " của bạn là:</p>"
                + "<p style=\"font-size:28px;font-weight:bold;letter-spacing:6px\">" + code + "</p>"
                + "<p>Mã có hiệu lực trong 10 phút. Không cung cấp mã này cho người khác.</p>";
        try {
            outboundEmailService.send("OTP_" + purpose + "_" + otp.getId() + "_" + now,
                    email, subject, body, true, List.of());
        } catch (Exception exception) {
            throw new BadRequestException("Không thể gửi OTP đến email. Vui lòng kiểm tra email hoặc thử lại sau");
        }
    }

    private void verify(String email, EmailOtp.Purpose purpose, String code) {
        EmailOtp otp = repository.findByEmailAndPurpose(email, purpose)
                .orElseThrow(() -> new BadRequestException("OTP không hợp lệ hoặc đã hết hạn"));
        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            repository.delete(otp);
            throw new BadRequestException("OTP đã hết hạn");
        }
        if (otp.getAttempts() >= MAX_ATTEMPTS) {
            throw new BadRequestException("OTP đã bị khóa. Vui lòng yêu cầu mã mới");
        }
        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            repository.save(otp);
            throw new BadRequestException("OTP không chính xác");
        }
        repository.delete(otp);
    }
}
