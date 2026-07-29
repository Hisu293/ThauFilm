package com.filmticket.service;

import com.filmticket.dto.UserResponse;
import com.filmticket.entity.User;
import com.filmticket.repository.UserRepository;
import com.filmticket.util.StringUtil; // Import hàm chuẩn hóa chuỗi của bạn
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder; // Import mã hóa password
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // Thêm final để Lombok tự động inject thông qua @RequiredArgsConstructor

    @PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String username = userDetails.getUsername();

        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("Đã lấy thông tin người dùng hiện tại: {}", user.getEmail());
        return UserResponse.fromUser(user);
    }

    // --- BỔ SUNG: BƯỚC 1 - LẤY CÂU HỎI BẢO MẬT BẰNG EMAIL ---
    public String getQuestionByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản gắn liền với email này"));

        if (user.getSecurityQuestion() == null || user.getSecurityQuestion().isBlank()) {
            throw new RuntimeException("Tài khoản này chưa thiết lập câu hỏi bảo mật!");
        }

        log.info("Fetched security question for email: {}", email);
        return user.getSecurityQuestion();
    }

    // --- BỔ SUNG: BƯỚC 2 - XÁC THỰC CÂU TRẢ LỜI VÀ ĐẶT LẠI MẬT KHẨU CẤP 1 ---
    public void resetPasswordWithQuestion(String email, String rawAnswer, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản gắn liền với email này"));

        // Chuẩn hóa câu trả lời (Xóa dấu tiếng Việt, viết thường, xóa cách)
        String processedAnswer = StringUtil.normalizeAnswer(rawAnswer);

        // Dùng BCrypt để đối chiếu câu trả lời
        if (!passwordEncoder.matches(processedAnswer, user.getSecurityAnswer())) {
            throw new RuntimeException("Câu trả lời bảo mật không chính xác!");
        }

        // Nếu đúng, mã hóa mật khẩu cấp 1 mới và lưu lại
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Successfully reset password via security question for email: {}", email);
    }
}