package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.InventoryForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/api/admin/inventory") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminInventoryController {
    private final InventoryForecastService service;
    @GetMapping("/forecast") public ResponseEntity<ApiResponse<Map<String, Object>>> forecast() { return ResponseEntity.ok(ApiResponse.success("Inventory forecast fetched", service.dashboard())); }
    @GetMapping("/recipes") public ResponseEntity<ApiResponse<List<Map<String, Object>>>> recipes() { return ResponseEntity.ok(ApiResponse.success("Recipes fetched", service.configuration())); }
    @GetMapping("/combos") public ResponseEntity<ApiResponse<List<Map<String, Object>>>> combos() { return ResponseEntity.ok(ApiResponse.success("Combos fetched", service.combos())); }
    @PostMapping("/items") public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody ItemRequest request) { return ResponseEntity.ok(ApiResponse.success("Inventory item created", service.saveItem(null, request.name(), request.unit(), request.currentStock(), request.reorderLevel(), request.active()))); }
    @PutMapping("/items/{id}") public ResponseEntity<ApiResponse<Map<String, Object>>> update(@PathVariable UUID id, @RequestBody ItemRequest request) { return ResponseEntity.ok(ApiResponse.success("Inventory item updated", service.saveItem(id, request.name(), request.unit(), request.currentStock(), request.reorderLevel(), request.active()))); }
    @PostMapping("/recipes") public ResponseEntity<ApiResponse<Map<String, Object>>> recipe(@RequestBody RecipeRequest request) { return ResponseEntity.ok(ApiResponse.success("Recipe saved", service.saveRecipe(request.comboId(), request.inventoryItemId(), request.quantityPerCombo()))); }
    public record ItemRequest(String name, String unit, BigDecimal currentStock, BigDecimal reorderLevel, Boolean active) {}
    public record RecipeRequest(UUID comboId, UUID inventoryItemId, BigDecimal quantityPerCombo) {}
}
