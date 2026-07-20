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
        log.info("User registered: {}", saved.getEmail());

        return issueTokens(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!user.isEnabled()) {
            throw new BadRequestException("Account is disabled");
        }

        if (user.getProvider() != User.AuthProvider.EMAIL) {
            throw new BadRequestException("Please use " + user.getProvider().name().toLowerCase() + " login for this account");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        log.info("User logged in: {}", user.getEmail());
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        log.info("Google login attempt");

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
            log.info("New user created via Google: {}", email);
            return userRepository.save(newUser);
        });

        if (!user.isEnabled()) {
            throw new BadRequestException("Account is disabled");
        }

        log.info("Google login success: {}", user.getEmail());
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
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenRepository.findByToken(refreshTokenValue).ifPresent(token -> {
                token.setRevoked(true);
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            });
        }

        log.info("User logged out");
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
}