package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.FavoriteListResponse;
import com.filmticket.service.FavoriteListService;
import com.filmticket.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/favorite-lists")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class FavoriteListController {

    private final FavoriteListService favoriteListService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Get a shared public favorite list")
    @GetMapping("/public/{listId}")
    public ResponseEntity<ApiResponse<FavoriteListResponse>> getPublicList(@PathVariable UUID listId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Public favorite list fetched successfully",
                favoriteListService.getPublicList(listId)
        ));
    }

    @Operation(summary = "Get my favorite lists")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<FavoriteListResponse>>> getMyLists(
            @AuthenticationPrincipal UserDetails user
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Favorite lists fetched successfully",
                favoriteListService.getMyLists(userId)
        ));
    }

    @Operation(summary = "Get a favorite list by ID")
    @GetMapping("/{listId}")
    public ResponseEntity<ApiResponse<FavoriteListResponse>> getList(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID listId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Favorite list fetched successfully",
                favoriteListService.getListById(listId, userId)
        ));
    }

    @Operation(summary = "Create a new favorite list")
    @PostMapping
    public ResponseEntity<ApiResponse<FavoriteListResponse>> createList(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody FavoriteListResponse.CreateRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Favorite list created successfully",
                        favoriteListService.createList(userId, request)));
    }

    @Operation(summary = "Update a favorite list")
    @PutMapping("/{listId}")
    public ResponseEntity<ApiResponse<FavoriteListResponse>> updateList(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID listId,
            @Valid @RequestBody FavoriteListResponse.UpdateRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Favorite list updated successfully",
                favoriteListService.updateList(userId, listId, request)
        ));
    }

    @Operation(summary = "Delete a favorite list")
    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> deleteList(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID listId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        favoriteListService.deleteList(userId, listId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Add a movie to a favorite list")
    @PostMapping("/{listId}/movies")
    public ResponseEntity<ApiResponse<FavoriteListResponse>> addMovie(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID listId,
            @Valid @RequestBody FavoriteListResponse.AddMovieRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Movie added to favorite list",
                favoriteListService.addMovieToList(userId, listId, request)
        ));
    }

    @Operation(summary = "Remove a movie from a favorite list")
    @DeleteMapping("/{listId}/movies/{movieId}")
    public ResponseEntity<Void> removeMovie(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID listId,
            @PathVariable UUID movieId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        favoriteListService.removeMovieFromList(userId, listId, movieId);
        return ResponseEntity.noContent().build();
    }
}
