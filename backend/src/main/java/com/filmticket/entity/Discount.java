package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "discounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Discount {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal minPurchaseAmount;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(nullable = false)
    private LocalDateTime validFrom;

    @Column(nullable = false)
    private LocalDateTime validTo;

    @Column(nullable = false)
    private Integer usageLimit;

    @Column(nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Comma-separated seat types e.g. "STANDARD,VIP,COUPLE". NULL = applies to all seat types.
    @Column(length = 100)
    private String applicableSeatTypes;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
