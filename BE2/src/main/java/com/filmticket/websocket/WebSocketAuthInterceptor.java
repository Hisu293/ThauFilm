package com.filmticket.websocket;

import com.filmticket.repository.UserRepository;
import com.filmticket.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements HandshakeInterceptor {
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String remoteAddr = request.getRemoteAddress() != null ? request.getRemoteAddress().getAddress().getHostAddress() : "unknown";
        log.info("[WS Handshake] Incoming connection from {} to {}", remoteAddr, request.getURI());

        MultiValueMap<String, String> query = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
        String movieId = query.getFirst("movieId");
        if (movieId != null && !movieId.isBlank()) {
            try {
                UUID parsedMovieId = UUID.fromString(movieId);
                attributes.put("movieId", parsedMovieId);
                log.debug("[WS Handshake] movieId parsed: {}", parsedMovieId);
            } catch (IllegalArgumentException e) {
                log.warn("[WS Handshake] Invalid movieId format: {}", movieId);
                return false;
            }
        }

        String token = query.getFirst("token");
        log.debug("[WS Handshake] Token present: {}", token != null);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            String email = jwtTokenProvider.getUsernameFromToken(token);
            log.debug("[WS Handshake] Token valid for user: {}", email);
            userRepository.findByEmail(email).ifPresent(user -> {
                attributes.put("userId", user.getId());
                log.info("[WS Handshake] userId set: {} ({})", user.getId(), email);
            });
        } else if (token != null) {
            log.warn("[WS Handshake] Token present but INVALID: {}", token.substring(0, Math.min(20, token.length())) + "...");
        }

        boolean hasMovieId = attributes.containsKey("movieId");
        boolean hasUserId = attributes.containsKey("userId");
        log.info("[WS Handshake] Result - hasMovieId: {}, hasUserId: {}, ACCEPTED: {}",
                hasMovieId, hasUserId, hasMovieId || hasUserId);
        return hasMovieId || hasUserId;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            log.error("[WS Handshake] afterHandshake error", exception);
        }
    }
}
