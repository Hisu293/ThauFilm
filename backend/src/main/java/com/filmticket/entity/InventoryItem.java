package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "inventory_items")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class InventoryItem {
    @Id private UUID id;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 30) private String unit;
    @Column(name = "current_stock", nullable = false) private BigDecimal currentStock;
    @Column(name = "reorder_level", nullable = false) private BigDecimal reorderLevel;
    @Column(nullable = false) private boolean active;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @PrePersist void create() { var now = LocalDateTime.now(); if (id == null) id = UUID.randomUUID(); if (currentStock == null) currentStock = BigDecimal.ZERO; if (reorderLevel == null) reorderLevel = BigDecimal.ZERO; if (createdAt == null) createdAt = now; updatedAt = now; }
    @PreUpdate void update() { updatedAt = LocalDateTime.now(); }
}
