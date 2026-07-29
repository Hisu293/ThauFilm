package com.filmticket.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.entity.AuditLog;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class AuditLogResponse {
    private UUID id;
    private LocalDateTime occurredAt;
    private UUID actorId;
    private String actorEmail;
    private String actorRole;
    private String actorType;
    private String action;
    private String actionLabel;
    private String category;
    private String severity;
    private String source;
    private String targetType;
    private String targetId;
    private String description;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private Object changedFields;
    private String reason;
    private String status;
    private String failureReason;
    private String ipAddress;
    private String userAgent;
    private String requestId;
    private String correlationId;
    private String sessionId;
    private String providerEventId;
    private UUID theaterId;
    private boolean sensitive;
    private Map<String, Object> metadata;

    public static AuditLogResponse from(AuditLog log, ObjectMapper objectMapper, String actionLabel) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .occurredAt(log.getOccurredAt())
                .actorId(log.getActorId())
                .actorEmail(log.getActorEmail())
                .actorRole(log.getActorRole())
                .actorType(log.getActorType().name())
                .action(log.getAction())
                .actionLabel(actionLabel)
                .category(log.getCategory().name())
                .severity(log.getSeverity().name())
                .source(log.getSource().name())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .description(log.getDescription())
                .oldValues(readMap(objectMapper, log.getOldValues()))
                .newValues(readMap(objectMapper, log.getNewValues()))
                .changedFields(readObject(objectMapper, log.getChangedFields()))
                .reason(log.getReason())
                .status(log.getStatus().name())
                .failureReason(log.getFailureReason())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .requestId(log.getRequestId())
                .correlationId(log.getCorrelationId())
                .sessionId(log.getSessionId())
                .providerEventId(log.getProviderEventId())
                .theaterId(log.getTheaterId())
                .sensitive(log.isSensitive())
                .metadata(readMap(objectMapper, log.getMetadata()))
                .build();
    }

    private static Map<String, Object> readMap(ObjectMapper mapper, String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ignored) {
            return Map.of("raw", json);
        }
    }

    private static Object readObject(ObjectMapper mapper, String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, Object.class);
        } catch (Exception ignored) {
            return json;
        }
    }
}
