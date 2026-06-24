package com.filmticket.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.dto.MovieMatchingDto;
import com.filmticket.service.MovieMatchInteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RealtimeWebSocketHandler extends TextWebSocketHandler {
    private final RealtimeEventService realtimeEventService;
    private final MovieMatchInteractionService movieMatchInteractionService;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        realtimeEventService.register(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if ("ping".equalsIgnoreCase(message.getPayload())) {
            send(session, Map.of("type", "PONG"));
            return;
        }
        try {
            JsonNode payload = objectMapper.readTree(message.getPayload());
            if (!"MATCH_SEND_MESSAGE".equals(payload.path("type").asText())) {
                sendError(session, "UNSUPPORTED_EVENT", "Loại sự kiện không được hỗ trợ");
                return;
            }
            UUID userId = (UUID) session.getAttributes().get("userId");
            if (userId == null) {
                sendError(session, "UNAUTHORIZED", "Phiên WebSocket chưa được xác thực");
                return;
            }
            JsonNode data = payload.path("data");
            UUID matchId = UUID.fromString(data.path("matchId").asText());
            MovieMatchingDto.MessageResponse saved = movieMatchInteractionService.sendMessage(
                    userId, matchId, data.path("content").asText(""));
            send(session, Map.of("type", "MATCH_MESSAGE", "data", Map.of(
                    "matchId", matchId,
                    "message", saved,
                    "clientMessageId", data.path("clientMessageId").asText("")
            )));
        } catch (IllegalArgumentException exception) {
            sendError(session, "INVALID_MESSAGE", "Dữ liệu tin nhắn không hợp lệ");
        } catch (Exception exception) {
            sendError(session, "MESSAGE_REJECTED", exception.getMessage() == null ? "Không thể gửi tin nhắn" : exception.getMessage());
        }
    }

    private void sendError(WebSocketSession session, String code, String message) throws Exception {
        send(session, Map.of("type", "MATCH_MESSAGE_ERROR", "data", Map.of("code", code, "message", message)));
    }

    private void send(WebSocketSession session, Object payload) throws Exception {
        synchronized (session) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        realtimeEventService.unregister(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        realtimeEventService.unregister(session);
    }
}
