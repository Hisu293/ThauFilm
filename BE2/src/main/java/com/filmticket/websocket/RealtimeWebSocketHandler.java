package com.filmticket.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.service.MovieMatchInteractionService;
import com.filmticket.service.GroupBookingRealtimeService;
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
    private final GroupBookingRealtimeService groupBookingRealtimeService;
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
            String type = payload.path("type").asText();
            UUID userId = (UUID) session.getAttributes().get("userId");
            if (userId == null) {
                sendError(session, "UNAUTHORIZED", "Phiên WebSocket chưa được xác thực");
                return;
            }
            JsonNode data = payload.path("data");
            if ("MATCH_SUBSCRIBE".equals(type)) {
                UUID matchId = UUID.fromString(data.path("matchId").asText());
                movieMatchInteractionService.authorizeMatchRoom(userId, matchId);
                session.getAttributes().put("matchId", matchId);
                send(session, Map.of("type", "MATCH_SUBSCRIBED", "data", Map.of("matchId", matchId)));
                return;
            }
            if ("GROUP_SUBSCRIBE".equals(type)) {
                UUID groupId = UUID.fromString(data.path("groupId").asText());
                var selectedSeatIds = groupBookingRealtimeService.subscribe(groupId, userId);
                session.getAttributes().put("groupBookingId", groupId);
                send(session, Map.of("type", "GROUP_SUBSCRIBED", "data", Map.of(
                        "groupId", groupId, "selectedSeatIds", selectedSeatIds)));
                return;
            }
            if ("GROUP_SEAT_TOGGLE".equals(type)) {
                UUID groupId = UUID.fromString(data.path("groupId").asText());
                if (!groupId.equals(session.getAttributes().get("groupBookingId"))) {
                    sendError(session, "NOT_SUBSCRIBED", "Bạn chưa tham gia phòng đặt vé nhóm này");
                    return;
                }
                groupBookingRealtimeService.toggleSeat(
                        groupId, userId, UUID.fromString(data.path("seatId").asText()));
                return;
            }
            if (!"MATCH_SEND_MESSAGE".equals(type)) {
                sendError(session, "UNSUPPORTED_EVENT", "Loại sự kiện không được hỗ trợ");
                return;
            }
            UUID matchId = UUID.fromString(data.path("matchId").asText());
            if (!matchId.equals(session.getAttributes().get("matchId"))) {
                sendError(session, "NOT_SUBSCRIBED", "Bạn chưa tham gia phòng chat này");
                return;
            }
            movieMatchInteractionService.sendMessage(
                    userId, matchId, data.path("content").asText(""));
        } catch (IllegalArgumentException exception) {
            sendError(session, "INVALID_MESSAGE", "Dữ liệu tin nhắn không hợp lệ");
        } catch (Exception exception) {
            sendError(session, "MESSAGE_REJECTED", exception.getMessage() == null ? "Không thể gửi tin nhắn" : exception.getMessage());
        }
    }

    private void sendError(WebSocketSession session, String code, String message) throws Exception {
        send(session, Map.of("type", "REALTIME_ERROR", "data", Map.of("code", code, "message", message)));
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
