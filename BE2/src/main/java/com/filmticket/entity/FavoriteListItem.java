package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "favorite_list_items",
    uniqueConstraints = @UniqueConstraint(columnNames = {"favorite_list_id", "movie_id"}),
    indexes = {
        @Index(name = "idx_favlistitem_list", columnList = "favorite_list_id"),
        @Index(name = "idx_favlistitem_movie", columnList = "movie_id")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FavoriteListItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "favorite_list_id", nullable = false)
    private UUID favoriteListId;

    @Column(name = "movie_id", nullable = false)
    private UUID movieId;

    @CreationTimestamp
    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
