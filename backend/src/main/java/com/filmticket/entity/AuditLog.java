package com.filmticket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_audit_logs_actor_id", columnList = "actor_id"),
        @Index(name = "idx_audit_logs_action", columnList = "action"),
        @Index(name = "idx_audit_logs_category", columnList = "category"),
        @Index(name = "idx_audit_logs_target", columnList = "target_type,target_id"),
        @Index(name = "idx_audit_logs_status", columnList = "status"),
        @Index(name = "idx_audit_logs_correlation_id", columnList = "correlation_id"),
        @Index(name = "idx_audit_logs_theater_id", columnList = "theater_id"),
        @Index(name = "idx_audit_logs_provider_event", columnList = "provider_event_id")
})
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    @Column(name = "actor_id")
    private UUID actorId;
    private String actorEmail;
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ActorType actorType;

    @Column(nullable = false, updatable = false, length = 100)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuditCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuditSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuditSource source;

    private String targetType;
    private String targetId;

    @Column(nullable = false, updatable = false, columnDefinition = "TEXT")
    private String description;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String oldValues;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String newValues;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String changedFields;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuditStatus status;

    @Column(updatable = false, columnDefinition = "TEXT")
    private String failureReason;
    private String ipAddress;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String userAgent;
    private String requestId;
    private String correlationId;
    private String sessionId;
    private String providerEventId;
    private UUID theaterId;
    private boolean sensitive;
    @Column(updatable = false, columnDefinition = "TEXT")
    private String metadata;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (occurredAt == null) occurredAt = LocalDateTime.now();
    }

    public enum ActorType { USER, SYSTEM, WEBHOOK }
    public enum AuditCategory {
        AUTH, USER, MOVIE, THEATER, ROOM, SHOWTIME, PRICING, VOUCHER,
        BOOKING, TICKET, PAYMENT, REFUND, STREAMING, WATCH_PARTY,
        GROUP_BOOKING, WORKFORCE, INVENTORY, MODERATION, REPORT, LOYALTY, SYSTEM
    }
    public enum AuditSeverity { INFO, WARNING, CRITICAL }
    public enum AuditSource { WEB, MOBILE, ADMIN_PORTAL, SCHEDULER, PAYOS_WEBHOOK, SYSTEM }
    public enum AuditStatus { SUCCESS, FAILED }
}
