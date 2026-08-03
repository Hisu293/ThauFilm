package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    @Column(name = "minimum_member_tier", nullable = false, length = 20)
    @Builder.Default
    private String minimumMemberTier = "V_STAR";

    @Column(name = "customer_segment", nullable = false, length = 20)
    @Builder.Default
    private String customerSegment = "ALL";

    @Column(name = "applicable_movie_ids", columnDefinition = "TEXT")
    private String applicableMovieIds;

    @Column(name = "applicable_genres", columnDefinition = "TEXT")
    private String applicableGenres;

    @Column(name = "applicable_theater_ids", columnDefinition = "TEXT")
    private String applicableTheaterIds;

    @Column(name = "applicable_room_ids", columnDefinition = "TEXT")
    private String applicableRoomIds;

    @Column(name = "applicable_showtime_ids", columnDefinition = "TEXT")
    private String applicableShowtimeIds;

    @Column(name = "applicable_channels", nullable = false, length = 100)
    @Builder.Default
    private String applicableChannels = "CINEMA";

    @Column(name = "applicable_weekdays", length = 100)
    private String applicableWeekdays;

    @Column(name = "start_hour")
    private LocalTime startHour;

    @Column(name = "end_hour")
    private LocalTime endHour;

    @Column(name = "per_user_limit", nullable = false)
    @Builder.Default
    private Integer perUserLimit = 1;

    @Column(name = "budget_limit", precision = 14, scale = 2)
    private BigDecimal budgetLimit;

    @Column(name = "budget_used", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal budgetUsed = BigDecimal.ZERO;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
