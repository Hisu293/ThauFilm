package com.filmticket.service;

import com.filmticket.dto.AuthResponse;
import com.filmticket.dto.GoogleLoginRequest;
import com.filmticket.dto.LoginRequest;
import com.filmticket.dto.RegisterRequest;
import com.filmticket.dto.ForgotPasswordRequest; // Nhớ import DTO mới
import com.filmticket.dto.ResetPasswordWithQuestionRequest; // Nhớ import DTO mới
import com.filmticket.entity.RefreshToken;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException; // Dùng exception chuẩn của dự án
import com.filmticket.repository.RefreshTokenRepository;
import com.filmticket.repository.UserRepository;
import com.filmticket.security.GoogleIdTokenVerifier;
import com.filmticket.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final UserService userService; // BỔ SUNG: Tiêm UserService để gọi các hàm xử lý câu hỏi bảo mật
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        // Chuẩn hóa câu trả lời (xóa dấu, xóa cách, viết thường) trước khi băm
        String processedAnswer = com.filmticket.util.StringUtil.normalizeAnswer(request.getSecurityAnswer());

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .provider(User.AuthProvider.EMAIL)
                .role(User.Role.MEMBER)
                .enabled(true)
                .securityQuestion(request.getSecurityQuestion())
                .securityAnswer(passwordEncoder.encode(processedAnswer)) // Mã hóa câu trả lời đã chuẩn hóa
                .build();

        User saved = userRepository.save(user);
        log.info("Người dùng đã đăng ký: {}", saved.getEmail());

        return issueTokens(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Đang thử đăng nhập: {}", request.getEmail());
        try {
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new BadRequestException("Invalid email or password"));
            if (!user.isEnabled()) throw new BadRequestException("Account is disabled");
            if (user.getProvider() != User.AuthProvider.EMAIL) {
                throw new BadRequestException("Please use " + user.getProvider().name().toLowerCase() + " login for this account");
            }
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new BadRequestException("Invalid email or password");
            }
            auditLogService.success(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.AUTH_LOGIN_SUCCEEDED)
                    .actorId(user.getId()).actorEmail(user.getEmail()).actorRole(user.getRole().name())
                    .targetType("USER").targetId(user.getId().toString())
                    .description("Người dùng đăng nhập thành công").sensitive(true).build());
            log.info("Người dùng đã đăng nhập: {}", user.getEmail());
            return issueTokens(user);
        } catch (RuntimeException exception) {
            auditLogService.failure(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.AUTH_LOGIN_FAILED)
                    .actorEmail(maskEmail(request.getEmail())).targetType("USER")
                    .description("Đăng nhập thất bại").sensitive(true)
                    .metadata(Map.of("emailĐãChe", maskEmail(request.getEmail()))).build(), exception);
            throw exception;
        }
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        log.info("Đang thử đăng nhập bằng Google");

        GoogleIdToken.Payload payload = googleIdTokenVerifier.verify(request.getIdToken())
                .orElseThrow(() -> new BadRequestException("Invalid Google ID token"));

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .fullName(name)
                    .avatarUrl(picture)
                    .provider(User.AuthProvider.GOOGLE)
                    .role(User.Role.MEMBER)
                    .enabled(true)
                    .build();
            log.info("Đã tạo người dùng mới qua Google: {}", email);
            return userRepository.save(newUser);
        });

        if (!user.isEnabled()) {
            throw new BadRequestException("Account is disabled");
        }

        log.info("Đăng nhập bằng Google thành công: {}", user.getEmail());
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.AUTH_GOOGLE_LOGIN_SUCCEEDED)
                .actorId(user.getId()).actorEmail(user.getEmail()).actorRole(user.getRole().name())
                .targetType("USER").targetId(user.getId().toString())
                .description("Người dùng đăng nhập Google thành công").sensitive(true).build());
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw new BadRequestException("Refresh token is required");
        }

        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (storedToken.isRevoked() || storedToken.isExpired()) {
            throw new BadRequestException("Refresh token is expired or revoked");
        }

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> new BadRequestException("User not found"));
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .type("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .provider(user.getProvider().name())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    // --- BỔ SUNG: 2 HÀM MỚI VÀO ĐÂY ĐỂ PHỤC VỤ CONTROLLER ---

    @Transactional(readOnly = true)
    public String getSecurityQuestion(ForgotPasswordRequest request) {
        try {
            return userService.getQuestionByEmail(request.getEmail());
        } catch (RuntimeException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @Transactional
    public void resetPasswordWithQuestion(ResetPasswordWithQuestionRequest request) {
        try {
            userService.resetPasswordWithQuestion(
                    request.getEmail(),
                    request.getAnswer(),
                    request.getNewPassword()
            );
        } catch (RuntimeException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    // ----------------------------------------------------

    @Transactional
    public void logout(String refreshTokenValue) {
        UUID revokedUserId = null;
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            RefreshToken token = refreshTokenRepository.findByToken(refreshTokenValue).orElse(null);
            if (token != null) {
                revokedUserId = token.getUserId();
                token.setRevoked(true);
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        }

        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.AUTH_LOGOUT).targetType("USER")
                .targetId(revokedUserId == null ? null : revokedUserId.toString())
                .description("Người dùng đăng xuất").sensitive(true).build());
        log.info("Người dùng đã đăng xuất");
    }

    @Transactional
    public AuthResponse issueTokens(User user) {
        String role = user.getRole() != null ? user.getRole().name() : User.Role.MEMBER.name();
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), role);
        String refreshTokenValue = jwtTokenProvider.generateRefreshToken(user.getEmail(), role);

        refreshTokenRepository.deleteAllByUserId(user.getId());

        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshTokenValue)
                .userId(user.getId())
                .expiryDate(Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpiration()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .type("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(role)
                .provider(user.getProvider().name())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) return "***";
        String[] parts = email.trim().split("@", 2);
        String name = parts[0];
        String visible = name.isEmpty() ? "*" : name.substring(0, 1);
        return visible + "***@" + parts[1];
    }
}
