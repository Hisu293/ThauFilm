package com.filmticket.dto;

import com.filmticket.entity.Follow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowResponse {
    private UUID id;
    private UUID followerId;
    private String followerFullName;
    private String followerAvatarUrl;
    private UUID followingId;
    private String followingFullName;
    private String followingAvatarUrl;
    private LocalDateTime createdAt;

    public static FollowResponse fromFollow(Follow follow) {
        return FollowResponse.builder()
                .id(follow.getId())
                .followerId(follow.getFollowerId())
                .followingId(follow.getFollowingId())
                .createdAt(follow.getCreatedAt())
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowerInfo {
        private UUID id;
        private String fullName;
        private String avatarUrl;
        private LocalDateTime followedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowingInfo {
        private UUID id;
        private String fullName;
        private String avatarUrl;
        private LocalDateTime followedAt;
    }
}
