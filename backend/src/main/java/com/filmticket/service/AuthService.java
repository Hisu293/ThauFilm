package com.filmticket.service;

import com.filmticket.dto.AuthResponse;
import com.filmticket.dto.GoogleLoginRequest;
import com.filmticket.dto.LoginRequest;
import com.filmticket.dto.RegisterRequest;
import com.filmticket.dto.EmailRequest;
import com.filmticket.dto.ResetPasswordRequest;
import com.filmticket.dto.VerifyRegistrationOtpRequest;
import com.filmticket.entity.RefreshToken;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
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
    private final AuditLogService auditLogService;
    private final EmailOtpService emailOtpService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User existing = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existing != null && existing.isEnabled()) {
            throw new BadRequestException("Email already registered");
        }

        User user = existing != null ? existing : User.builder()
                .email(normalizedEmail)
                .provider(User.AuthProvider.EMAIL)
                .role(User.Role.MEMBER)
                .enabled(false)
                .build();
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setEnabled(false);

        User saved = userRepository.save(user);
        log.info("Người dùng đã đăng ký: {}", saved.getEmail());

        emailOtpService.sendRegistrationOtp(saved.getEmail());
        return null;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Đang thử đăng nhập: {}", request.getEmail());
        try {
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new BadRequestException("Invalid email or password"));
            if (!user.isEnabled()) throw new BadRequestException("Email chưa được xác minh");
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
    public AuthResponse verifyRegistration(VerifyRegistrationOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadRequestException("Registration not found"));
        if (user.isEnabled()) throw new BadRequestException("Email already verified");
        emailOtpService.verifyRegistrationOtp(user.getEmail(), request.getOtp());
        user.setEnabled(true);
        userRepository.save(user);
        return issueTokens(user);
    }

    public void resendRegistrationOtp(EmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadRequestException("Registration not found"));
        if (user.isEnabled()) throw new BadRequestException("Email already verified");
        emailOtpService.sendRegistrationOtp(user.getEmail());
    }

    public void requestPasswordReset(EmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase()).orElse(null);
        if (user != null && user.isEnabled() && user.getProvider() == User.AuthProvider.EMAIL) {
            emailOtpService.sendPasswordResetOtp(user.getEmail());
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .filter(User::isEnabled)
                .filter(item -> item.getProvider() == User.AuthProvider.EMAIL)
                .orElseThrow(() -> new BadRequestException("OTP is invalid or expired"));
        emailOtpService.verifyPasswordResetOtp(user.getEmail(), request.getOtp());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.deleteAllByUserId(user.getId());
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
