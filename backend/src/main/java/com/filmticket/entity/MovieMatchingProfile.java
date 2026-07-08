package com.filmticket.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "movie_matching_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MovieMatchingProfile {
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(length = 500)
    private String bio;

    @Column(name = "favorite_genres", nullable = false, length = 500)
    @Builder.Default
    private String favoriteGenres = "";

    @Column(name = "preferred_theater")
    private String preferredTheater;

    @Column(name = "available_times", length = 500)
    private String availableTimes;

    @Builder.Default
    private boolean active = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
