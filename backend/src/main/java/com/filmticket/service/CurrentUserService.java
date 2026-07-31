package com.filmticket.service;

import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {
    private final UserRepository userRepository;

    public UUID requireUserId(UserDetails principal) {
        return findUserId(principal)
                .orElseThrow(() -> new BadRequestException("Bạn cần đăng nhập để thực hiện thao tác này"));
    }

    public Optional<UUID> findUserId(UserDetails principal) {
        if (principal == null) return Optional.empty();
        String username = principal.getUsername();
        try {
            return Optional.of(UUID.fromString(username));
        } catch (IllegalArgumentException ignored) {
            return userRepository.findByEmail(username)
                    .map(user -> user.getId());
        }
    }
}
