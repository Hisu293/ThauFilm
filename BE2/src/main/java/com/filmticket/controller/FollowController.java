package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.FollowResponse;
import com.filmticket.service.FollowService;
import com.filmticket.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/follow")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class FollowController {

    private final FollowService followService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Follow a user")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> follow(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID userId
    ) {
        UUID followerId = currentUserService.requireUserId(user);
        followService.follow(followerId, userId);
        return ResponseEntity.ok(ApiResponse.success("Followed successfully", null));
    }

    @Operation(summary = "Unfollow a user")
    @DeleteMapping
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID userId
    ) {
        UUID followerId = currentUserService.requireUserId(user);
        followService.unfollow(followerId, userId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Check if following a user")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getFollowStatus(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID userId
    ) {
        UUID followerId = currentUserService.requireUserId(user);
        boolean isFollowing = followService.isFollowing(followerId, userId);
        return ResponseEntity.ok(ApiResponse.success("Follow status fetched", Map.of("isFollowing", isFollowing)));
    }

    @Operation(summary = "Get followers of a user")
    @GetMapping("/followers")
    public ResponseEntity<ApiResponse<List<FollowResponse.FollowerInfo>>> getFollowers(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Followers fetched successfully",
                followService.getFollowers(userId)
        ));
    }

    @Operation(summary = "Get users that a user is following")
    @GetMapping("/following")
    public ResponseEntity<ApiResponse<List<FollowResponse.FollowingInfo>>> getFollowing(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Following fetched successfully",
                followService.getFollowing(userId)
        ));
    }
}
