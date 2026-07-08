package com.filmticket.dto;

import com.filmticket.entity.FavoriteList;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteListResponse {
    private UUID id;
    private String name;
    private UUID userId;
    private String userFullName;
    private Boolean isPublic;
    private LocalDateTime createdAt;
    private long movieCount;
    private List<MovieCardResponse> movies;

    public static FavoriteListResponse fromFavoriteList(FavoriteList list) {
        return FavoriteListResponse.builder()
                .id(list.getId())
                .name(list.getName())
                .userId(list.getUserId())
                .isPublic(list.getIsPublic())
                .createdAt(list.getCreatedAt())
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank
        private String name;

        @Builder.Default
        private Boolean isPublic = false;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private Boolean isPublic;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddMovieRequest {
        @jakarta.validation.constraints.NotNull
        private UUID movieId;
    }
}
