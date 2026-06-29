package com.filmticket.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeEventService {
    private final ObjectMapper objectMapper;
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    public void register(WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get("userId");
        log.info("[WS Register] sessionId={}, userId={}", session.getId(), userId);
        sessions.add(session);
    }
    public void unregister(WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get("userId");
        log.info("[WS Unregister] sessionId={}, userId={}", session.getId(), userId);
        sessions.remove(session);
    }

    public void broadcastComment(UUID movieId, String action, Object data) {
        sendMatching(session -> movieId.equals(session.getAttributes().get("movieId")), Map.of(
                "type", "COMMENT_" + action,
                "movieId", movieId,
                "data", data
        ), "COMMENT_" + action, movieId);
    }

    public void notifyUser(UUID userId, String type, String title, String message, String link) {
        sendMatching(session -> {
            UUID sessionUserId = (UUID) session.getAttributes().get("userId");
            return userId.equals(sessionUserId);
        }, Map.of(
                "type", "NOTIFICATION",
                "data", Map.of(
                        "id", UUID.randomUUID(),
                        "notificationType", type,
                        "title", title,
                        "message", message,
                        "link", link == null ? "" : link,
                        "createdAt", LocalDateTime.now()
                )
        ), type, userId);
    }

    public void sendUserEvent(UUID userId, String type, Object data) {
        sendMatching(session -> {
            UUID sessionUserId = (UUID) session.getAttributes().get("userId");
            return userId.equals(sessionUserId);
        }, Map.of(
                "type", type,
                "data", data
        ), type, userId);
    }

    public void sendMatchEvent(UUID matchId, String type, Object data) {
        sendMatching(session -> matchId.equals(session.getAttributes().get("matchId")), Map.of(
                "type", type,
                "data", data
        ), type, matchId);
    }

    public void sendGroupEvent(UUID groupBookingId, String type, Object data) {
        sendMatching(session -> groupBookingId.equals(session.getAttributes().get("groupBookingId")), Map.of(
                "type", type,
                "data", data
        ), type, groupBookingId);
    }

    private void sendMatching(java.util.function.Predicate<WebSocketSession> predicate, Object event, String eventType, Object targetId) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            long matchingCount = sessions.stream().filter(WebSocketSession::isOpen).filter(predicate).count();
            log.info("[WS Send] type={}, target={}, matchingSessions={}", eventType, targetId, matchingCount);
            sessions.stream().filter(WebSocketSession::isOpen).filter(predicate).forEach(session -> send(session, payload));
        } catch (Exception exception) {
            log.warn("[WS Send] Could not serialize realtime event: {}", exception.getMessage());
        }
    }

    private void send(WebSocketSession session, String payload) {
        try {
            synchronized (session) { session.sendMessage(new TextMessage(payload)); }
        } catch (IOException exception) {
            sessions.remove(session);
            log.debug("Removed closed WebSocket session {}", session.getId());
        }
    }
}
