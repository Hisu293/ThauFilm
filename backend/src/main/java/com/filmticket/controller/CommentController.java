package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.CommentResponse;
import com.filmticket.service.CommentService;
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
@RequestMapping("/api/movies/{movieId}/comments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CommentController {

    private final CommentService commentService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Get all comments for a movie (with replies)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Comments fetched successfully",
                commentService.getCommentsByMovie(movieId)
        ));
    }

    @Operation(summary = "Create a comment or reply")
    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID movieId,
            @Valid @RequestBody CommentResponse.CreateRequest request
    ) {
        UUID userId = currentUserService.requireUserId(user);
        request.setMovieId(movieId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Comment created successfully",
                        commentService.createComment(userId, request)));
    }

    @Operation(summary = "Update your comment")
    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID commentId,
            @RequestBody java.util.Map<String, String> body
    ) {
        UUID userId = currentUserService.requireUserId(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Comment updated successfully",
                commentService.updateComment(userId, commentId, body.get("content"))
        ));
    }

    @Operation(summary = "Delete your comment")
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID commentId
    ) {
        UUID userId = currentUserService.requireUserId(user);
        commentService.deleteComment(userId, commentId);
        return ResponseEntity.noContent().build();
    }
}
