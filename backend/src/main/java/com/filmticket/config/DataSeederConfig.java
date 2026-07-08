package com.filmticket.config;

import com.filmticket.entity.User;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSeederConfig {

    private static final String ADMIN_EMAIL = "admin@gmail.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "123456";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedDefaultAdmin() {
        return args -> userRepository.findByEmail(ADMIN_EMAIL)
                .ifPresentOrElse(this::ensureDefaultAdminCredentials, this::createDefaultAdmin);
    }

    private void ensureDefaultAdminCredentials(User existingAdmin) {
        boolean changed = false;

        if (existingAdmin.getProvider() != User.AuthProvider.EMAIL) {
            existingAdmin.setProvider(User.AuthProvider.EMAIL);
            changed = true;
        }

        if (existingAdmin.getRole() != User.Role.ADMIN) {
            existingAdmin.setRole(User.Role.ADMIN);
            changed = true;
        }

        if (!existingAdmin.isEnabled()) {
            existingAdmin.setEnabled(true);
            changed = true;
        }

        if (!passwordEncoder.matches(DEFAULT_ADMIN_PASSWORD, existingAdmin.getPassword())) {
            existingAdmin.setPassword(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD));
            changed = true;
        }

        if (changed) {
            userRepository.save(existingAdmin);
            log.info("Reset default admin account credentials: {} / {}", ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
        } else {
            log.info("Default admin account is ready: {}", ADMIN_EMAIL);
        }
    }

    private void createDefaultAdmin() {
        User admin = User.builder()
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD))
                .fullName("Admin User")
                .phone("0900000001")
                .provider(User.AuthProvider.EMAIL)
                .role(User.Role.ADMIN)
                .enabled(true)
                .build();

        userRepository.save(admin);
        log.info("Seeded default admin account: {} / {}", ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
    }
}
