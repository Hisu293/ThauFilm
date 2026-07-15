package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "combo_inventory_recipes", uniqueConstraints = @UniqueConstraint(columnNames = {"combo_id", "inventory_item_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ComboInventoryRecipe {
    @Id private UUID id;
    @Column(name = "combo_id", nullable = false) private UUID comboId;
    @Column(name = "inventory_item_id", nullable = false) private UUID inventoryItemId;
    @Column(name = "quantity_per_combo", nullable = false) private BigDecimal quantityPerCombo;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void create() { if (id == null) id = UUID.randomUUID(); if (createdAt == null) createdAt = LocalDateTime.now(); }
}
