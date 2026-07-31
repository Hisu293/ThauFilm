package com.filmticket.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.dto.UserNotificationDto;
import com.filmticket.entity.UserNotification;
import com.filmticket.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeEventService {
    private final ObjectMapper objectMapper;
    private final UserNotificationRepository notificationRepository;
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    public void register(WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get("userId");
        log.info("[WS Đăng ký] sessionId={}, userId={}", session.getId(), userId);
        sessions.add(session);
    }
    public void unregister(WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get("userId");
        log.info("[WS Hủy đăng ký] sessionId={}, userId={}", session.getId(), userId);
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
        UserNotification notification = notificationRepository.save(UserNotification.builder()
                .userId(userId).notificationType(type).title(title).message(message)
                .link(link == null ? "" : link).build());
        sendMatching(session -> {
            UUID sessionUserId = (UUID) session.getAttributes().get("userId");
            return userId.equals(sessionUserId);
        }, Map.of(
                "type", "NOTIFICATION",
                "data", UserNotificationDto.from(notification)
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

    public void sendWatchPartyEvent(UUID roomId, String type, Object data) {
        sendMatching(session -> roomId.equals(session.getAttributes().get("watchPartyId")), Map.of(
                "type", type,
                "data", data
        ), type, roomId);
    }

    private void sendMatching(java.util.function.Predicate<WebSocketSession> predicate, Object event, String eventType, Object targetId) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            long matchingCount = sessions.stream().filter(WebSocketSession::isOpen).filter(predicate).count();
            log.info("[WS Gửi] loại={}, đích={}, số phiên phù hợp={}", eventType, targetId, matchingCount);
            sessions.stream().filter(WebSocketSession::isOpen).filter(predicate).forEach(session -> send(session, payload));
        } catch (Exception exception) {
            log.warn("[WS Gửi] Không thể tuần tự hóa sự kiện thời gian thực: {}", exception.getMessage());
        }
    }

    private void send(WebSocketSession session, String payload) {
        try {
            synchronized (session) { session.sendMessage(new TextMessage(payload)); }
        } catch (IOException exception) {
            sessions.remove(session);
            log.debug("Đã xóa phiên WebSocket đóng {}", session.getId());
        }
    }
}
