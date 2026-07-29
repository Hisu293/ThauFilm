package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.AuditLogResponse;
import com.filmticket.entity.AuditLog;
import com.filmticket.service.AuditAction;
import com.filmticket.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminAuditLogController {
    private final AuditLogService auditLogService;

    @Operation(summary = "Tra cứu nhật ký hệ thống")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) AuditLog.AuditCategory category,
            @RequestParam(required = false) AuditLog.AuditStatus status,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetId,
            @RequestParam(required = false) UUID theaterId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<AuditLogResponse> result = auditLogService.search(
                from, to, actorId, action, category, status, targetType, targetId, theaterId,
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "occurredAt"))
        );
        return ResponseEntity.ok(ApiResponse.success("Đã tải nhật ký hệ thống", result));
    }

    @Operation(summary = "Lấy danh mục sự kiện nhật ký")
    @GetMapping("/actions")
    public ResponseEntity<ApiResponse<Map<String, String>>> actions() {
        Map<String, String> actions = Arrays.stream(AuditAction.values())
                .collect(java.util.stream.Collectors.toMap(
                        AuditAction::name,
                        AuditAction::getVietnameseLabel,
                        (first, ignored) -> first,
                        java.util.LinkedHashMap::new
                ));
        return ResponseEntity.ok(ApiResponse.success("Đã tải danh mục sự kiện nhật ký", actions));
    }
}
