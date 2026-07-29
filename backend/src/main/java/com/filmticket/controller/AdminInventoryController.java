package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.InventoryForecastService;
import com.filmticket.service.AuditAction;
import com.filmticket.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/api/admin/inventory") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminInventoryController {
    private final InventoryForecastService service;
    private final AuditLogService auditLogService;
    @GetMapping("/forecast") public ResponseEntity<ApiResponse<Map<String, Object>>> forecast() { return ResponseEntity.ok(ApiResponse.success("Inventory forecast fetched", service.dashboard())); }
    @GetMapping("/recipes") public ResponseEntity<ApiResponse<List<Map<String, Object>>>> recipes() { return ResponseEntity.ok(ApiResponse.success("Recipes fetched", service.configuration())); }
    @GetMapping("/combos") public ResponseEntity<ApiResponse<List<Map<String, Object>>>> combos() { return ResponseEntity.ok(ApiResponse.success("Combos fetched", service.combos())); }
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody ItemRequest request) {
        Map<String, Object> item = service.saveItem(null, request.name(), request.unit(),
                request.currentStock(), request.reorderLevel(), request.active());
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.INVENTORY_ITEM_CREATED).targetType("INVENTORY_ITEM")
                .targetId(String.valueOf(item.get("id"))).description("Đã tạo mặt hàng kho \"" + request.name() + "\"")
                .newValues(item).build());
        return ResponseEntity.ok(ApiResponse.success("Đã tạo mặt hàng kho", item));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable UUID id, @RequestBody ItemRequest request) {
        Map<String, Object> item = service.saveItem(id, request.name(), request.unit(),
                request.currentStock(), request.reorderLevel(), request.active());
        AuditAction action = Boolean.FALSE.equals(request.active())
                ? AuditAction.INVENTORY_ITEM_DISABLED : AuditAction.INVENTORY_STOCK_ADJUSTED;
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(action).targetType("INVENTORY_ITEM").targetId(id.toString())
                .description(Boolean.FALSE.equals(request.active())
                        ? "Đã ngừng sử dụng mặt hàng kho \"" + request.name() + "\""
                        : "Đã cập nhật mặt hàng và tồn kho \"" + request.name() + "\"")
                .newValues(item).build());
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật mặt hàng kho", item));
    }

    @PostMapping("/recipes")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recipe(@RequestBody RecipeRequest request) {
        Map<String, Object> recipe = service.saveRecipe(
                request.comboId(), request.inventoryItemId(), request.quantityPerCombo());
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.INVENTORY_RECIPE_CHANGED).targetType("INVENTORY_RECIPE")
                .targetId(String.valueOf(recipe.get("id"))).description("Đã thay đổi định mức nguyên liệu combo")
                .newValues(recipe).build());
        return ResponseEntity.ok(ApiResponse.success("Đã lưu định mức nguyên liệu", recipe));
    }
    public record ItemRequest(String name, String unit, BigDecimal currentStock, BigDecimal reorderLevel, Boolean active) {}
    public record RecipeRequest(UUID comboId, UUID inventoryItemId, BigDecimal quantityPerCombo) {}
}
