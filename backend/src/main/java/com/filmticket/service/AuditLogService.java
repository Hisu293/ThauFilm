package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.dto.AuditLogResponse;
import com.filmticket.config.RequestIdFilter;
import com.filmticket.entity.AuditLog;
import com.filmticket.entity.AuditLog.ActorType;
import com.filmticket.entity.AuditLog.AuditSource;
import com.filmticket.entity.AuditLog.AuditStatus;
import com.filmticket.entity.User;
import com.filmticket.repository.AuditLogRepository;
import com.filmticket.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password", "token", "access_token", "refreshtoken", "refresh_token", "otp",
            "secret", "apikey", "api_key", "authorization", "qrcode", "qr_code",
            "checkouturl", "checkout_url", "signature"
    );

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void success(AuditAction action, String targetType, Object targetId, String description) {
        record(AuditCommand.builder()
                .action(action)
                .targetType(targetType)
                .targetId(stringValue(targetId))
                .description(description)
                .status(AuditStatus.SUCCESS)
                .build());
    }

    @Transactional
    public void success(AuditCommand command) {
        record(command.toBuilder().status(AuditStatus.SUCCESS).build());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failure(AuditCommand command, Throwable throwable) {
        String failureReason = throwable == null ? command.getFailureReason() : safeFailure(throwable);
        record(command.toBuilder()
                .status(AuditStatus.FAILED)
                .failureReason(failureReason)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(
            LocalDateTime from,
            LocalDateTime to,
            UUID actorId,
            String action,
            AuditLog.AuditCategory category,
            AuditStatus status,
            String targetType,
            String targetId,
            UUID theaterId,
            Pageable pageable
    ) {
        Specification<AuditLog> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            if (actorId != null) predicates.add(cb.equal(root.get("actorId"), actorId));
            if (action != null && !action.isBlank()) predicates.add(cb.equal(root.get("action"), action.trim()));
            if (category != null) predicates.add(cb.equal(root.get("category"), category));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (targetType != null && !targetType.isBlank()) predicates.add(cb.equal(root.get("targetType"), targetType.trim()));
            if (targetId != null && !targetId.isBlank()) predicates.add(cb.equal(root.get("targetId"), targetId.trim()));
            if (theaterId != null) predicates.add(cb.equal(root.get("theaterId"), theaterId));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return auditLogRepository.findAll(specification, pageable)
                .map(logEntry -> AuditLogResponse.from(logEntry, objectMapper, actionLabel(logEntry.getAction())));
    }

    private void record(AuditCommand command) {
        if (command == null || command.getAction() == null) return;
        try {
            if (command.getProviderEventId() != null
                    && auditLogRepository.existsByActionAndProviderEventId(
                    command.getAction().name(), command.getProviderEventId())) {
                return;
            }
            ActorContext actor = resolveActor(command);
            RequestContext request = resolveRequest();
            AuditLog auditLog = AuditLog.builder()
                    .actorId(actor.id())
                    .actorEmail(actor.email())
                    .actorRole(actor.role())
                    .actorType(command.getActorType() == null ? actor.type() : command.getActorType())
                    .action(command.getAction().name())
                    .category(command.getAction().getCategory())
                    .severity(command.getAction().getSeverity())
                    .source(command.getSource() == null ? request.source() : command.getSource())
                    .targetType(command.getTargetType())
                    .targetId(command.getTargetId())
                    .description(defaultDescription(command))
                    .oldValues(toJson(command.getOldValues()))
                    .newValues(toJson(command.getNewValues()))
                    .changedFields(toJson(changedFields(command.getOldValues(), command.getNewValues())))
                    .reason(command.getReason())
                    .status(command.getStatus() == null ? AuditStatus.SUCCESS : command.getStatus())
                    .failureReason(command.getFailureReason())
                    .ipAddress(request.ipAddress())
                    .userAgent(request.userAgent())
                    .requestId(firstNonBlank(command.getRequestId(), request.requestId()))
                    .correlationId(command.getCorrelationId())
                    .sessionId(command.getSessionId())
                    .providerEventId(command.getProviderEventId())
                    .theaterId(command.getTheaterId())
                    .sensitive(command.isSensitive())
                    .metadata(toJson(command.getMetadata()))
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception exception) {
            log.error("Không thể lưu nhật ký hệ thống cho sự kiện {}: {}",
                    command.getAction(), exception.getMessage());
        }
    }

    private ActorContext resolveActor(AuditCommand command) {
        if (command.getActorId() != null || command.getActorEmail() != null) {
            return new ActorContext(command.getActorId(), command.getActorEmail(), command.getActorRole(),
                    command.getActorType() == null ? ActorType.USER : command.getActorType());
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return new ActorContext(null, null, null,
                    command.getActorType() == null ? ActorType.SYSTEM : command.getActorType());
        }
        String username = authentication.getName();
        User user = userRepository.findByEmail(username).orElse(null);
        if (user == null) {
            try {
                user = userRepository.findById(UUID.fromString(username)).orElse(null);
            } catch (IllegalArgumentException ignored) {
                // Tên principal không phải UUID.
            }
        }
        return user == null
                ? new ActorContext(null, username, authentication.getAuthorities().toString(), ActorType.USER)
                : new ActorContext(user.getId(), user.getEmail(), user.getRole().name(), ActorType.USER);
    }

    private RequestContext resolveRequest() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return new RequestContext(null, null, null, AuditSource.SYSTEM);
        }
        HttpServletRequest request = attributes.getRequest();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        String ipAddress = forwardedFor == null || forwardedFor.isBlank()
                ? request.getRemoteAddr()
                : forwardedFor.split(",")[0].trim();
        AuditSource source = request.getRequestURI().startsWith("/api/admin")
                ? AuditSource.ADMIN_PORTAL : AuditSource.WEB;
        return new RequestContext(
                ipAddress,
                request.getHeader("User-Agent"),
                firstNonBlank(
                        request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE) instanceof String value ? value : null,
                        request.getHeader("X-Correlation-Id")
                ),
                source
        );
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(sanitize(value));
        } catch (Exception exception) {
            return "{\"thông_báo\":\"Không thể chuyển dữ liệu nhật ký sang JSON\"}";
        }
    }

    private Object sanitize(Object value) {
        Object tree = objectMapper.convertValue(value, Object.class);
        return sanitizeTree(tree);
    }

    private Object sanitizeTree(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> sanitized = new LinkedHashMap<>();
            map.forEach((key, item) -> {
                String name = String.valueOf(key);
                sanitized.put(name, isSensitiveKey(name) ? "***ĐÃ CHE***" : sanitizeTree(item));
            });
            return sanitized;
        }
        if (value instanceof Collection<?> collection) {
            return collection.stream().map(this::sanitizeTree).toList();
        }
        return value;
    }

    private boolean isSensitiveKey(String key) {
        String normalized = key.replace("-", "_").toLowerCase(Locale.ROOT);
        return SENSITIVE_KEYS.stream().anyMatch(normalized::contains);
    }

    private List<String> changedFields(Object oldValues, Object newValues) {
        if (oldValues == null || newValues == null) return null;
        Map<String, Object> oldMap = objectMapper.convertValue(sanitize(oldValues), Map.class);
        Map<String, Object> newMap = objectMapper.convertValue(sanitize(newValues), Map.class);
        return newMap.keySet().stream()
                .filter(key -> !java.util.Objects.equals(oldMap.get(key), newMap.get(key)))
                .toList();
    }

    private String defaultDescription(AuditCommand command) {
        if (command.getDescription() != null && !command.getDescription().isBlank()) {
            return command.getDescription().trim();
        }
        return command.getAction().getVietnameseLabel();
    }

    private String actionLabel(String action) {
        try {
            return AuditAction.valueOf(action).getVietnameseLabel();
        } catch (IllegalArgumentException ignored) {
            return action;
        }
    }

    private String safeFailure(Throwable throwable) {
        String message = throwable.getMessage();
        if (message == null || message.isBlank()) return "Thao tác không thành công do lỗi hệ thống.";
        String normalized = message.toLowerCase(Locale.ROOT);
        if (normalized.contains("bad credentials") || normalized.contains("invalid credentials")) {
            return "Thông tin đăng nhập không chính xác.";
        }
        if (normalized.contains("access denied") || normalized.contains("forbidden")) {
            return "Người thực hiện không có quyền hoàn tất thao tác này.";
        }
        if (normalized.contains("not found")) return "Không tìm thấy dữ liệu cần xử lý.";
        if (normalized.contains("timeout") || normalized.contains("timed out")) {
            return "Hệ thống xử lý quá thời gian cho phép.";
        }
        if (normalized.contains("connection") || normalized.contains("connect")) {
            return "Không thể kết nối tới dịch vụ liên quan.";
        }
        if (normalized.contains("duplicate") || normalized.contains("already exists")) {
            return "Dữ liệu đã tồn tại trong hệ thống.";
        }
        if (message.matches(".*[À-ỹĐđ].*")) return message.length() > 1000 ? message.substring(0, 1000) : message;
        return "Không thể hoàn tất thao tác do lỗi hệ thống. Hãy kiểm tra nhật ký máy chủ bằng Request ID.";
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private record ActorContext(UUID id, String email, String role, ActorType type) {}
    private record RequestContext(String ipAddress, String userAgent, String requestId, AuditSource source) {}

    @lombok.Getter
    @Builder(toBuilder = true)
    public static class AuditCommand {
        private AuditAction action;
        private String targetType;
        private String targetId;
        private String description;
        private Object oldValues;
        private Object newValues;
        private String reason;
        private AuditStatus status;
        private String failureReason;
        private UUID actorId;
        private String actorEmail;
        private String actorRole;
        private ActorType actorType;
        private AuditSource source;
        private String requestId;
        private String correlationId;
        private String sessionId;
        private String providerEventId;
        private UUID theaterId;
        private boolean sensitive;
        private Object metadata;
    }
}
