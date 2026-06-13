package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.MovieResponse;
import com.filmticket.dto.UserResponse;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.MovieService;
import com.filmticket.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final MovieService movieService;

    @Operation(summary = "Admin test endpoint")
    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> ping() {
        return ResponseEntity.ok(ApiResponse.success("Admin access granted", "ADMIN_OK"));
    }

    @Operation(summary = "Inspect current admin authentication")
    @GetMapping("/auth-check")
    public ResponseEntity<ApiResponse<AuthCheckResponse>> authCheck(Authentication authentication) {
        List<String> authorities = authentication.getAuthorities().stream()
                .map(Object::toString)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                "Authentication inspected successfully",
                AuthCheckResponse.builder()
                        .name(authentication.getName())
                        .authorities(authorities)
                        .authenticated(authentication.isAuthenticated())
                        .build()
        ));
    }

    @Operation(summary = "Get user by id")
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID userId) {
        User user = getUserOrThrow(userId);
        return ResponseEntity.ok(ApiResponse.success("User fetched successfully", UserResponse.fromUser(user)));
    }

    @Operation(summary = "List all users")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers() {
        List<UserResponse> users = userRepository.findAll().stream()
                .map(UserResponse::fromUser)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Users fetched successfully", users));
    }

    @Operation(summary = "List all admin movies")
    @GetMapping("/movies")
    public ResponseEntity<ApiResponse<List<MovieResponse>>> listMovies() {
        return ResponseEntity.ok(ApiResponse.success("Movies fetched successfully", movieService.getAllMovies()));
    }

    @Operation(summary = "Get admin movie by id")
    @GetMapping("/movies/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> getMovieById(@PathVariable UUID movieId) {
        return ResponseEntity.ok(ApiResponse.success("Movie fetched successfully", movieService.getMovieById(movieId)));
    }

    @Operation(summary = "Create a movie")
    @PostMapping("/movies")
    public ResponseEntity<ApiResponse<MovieResponse>> createMovie(
            @Valid @RequestBody MovieService.UpsertMovieRequest request
    ) {
        MovieResponse movie = movieService.createMovie(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Movie created successfully", movie));
    }

    @Operation(summary = "Update a movie")
    @PutMapping("/movies/{movieId}")
    public ResponseEntity<ApiResponse<MovieResponse>> updateMovie(
            @PathVariable UUID movieId,
            @Valid @RequestBody MovieService.UpsertMovieRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Movie updated successfully", movieService.updateMovie(movieId, request)));
    }

    @Operation(summary = "Delete a movie")
    @DeleteMapping("/movies/{movieId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteMovie(@PathVariable UUID movieId) {
        movieService.deleteMovie(movieId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get admin dashboard summary")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard() {
        long totalUsers = userRepository.count();
        long totalAdmins = userRepository.countByRole(User.Role.ADMIN);
        long totalStaff = userRepository.countByRole(User.Role.STAFF);
        long totalMembers = userRepository.countByRole(User.Role.MEMBER);
        long enabledUsers = userRepository.countByEnabled(true);
        long disabledUsers = userRepository.countByEnabled(false);

        AdminDashboardResponse dashboard = AdminDashboardResponse.builder()
                .totalUsers(totalUsers)
                .totalAdmins(totalAdmins)
                .totalStaff(totalStaff)
                .totalMembers(totalMembers)
                .enabledUsers(enabledUsers)
                .disabledUsers(disabledUsers)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Dashboard fetched successfully", dashboard));
    }

    @Operation(summary = "Get current admin profile")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        return ResponseEntity.ok(ApiResponse.success("Current admin fetched successfully", userService.getCurrentUser()));
    }

    @Operation(summary = "Update a user's role")
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        User user = getUserOrThrow(userId);
        validateRoleChange(user, request.getRole());
        user.setRole(request.getRole());
        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User role updated successfully", UserResponse.fromUser(saved)));
    }

    @Operation(summary = "Disable a user")
    @PutMapping("/users/{userId}/disable")
    public ResponseEntity<ApiResponse<UserResponse>> disableUser(@PathVariable UUID userId) {
        User user = getUserOrThrow(userId);
        validateDisable(user);
        user.setEnabled(false);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User disabled successfully", UserResponse.fromUser(saved)));
    }

    @Operation(summary = "Enable a user")
    @PutMapping("/users/{userId}/enable")
    public ResponseEntity<ApiResponse<UserResponse>> enableUser(@PathVariable UUID userId) {
        User user = getUserOrThrow(userId);
        user.setEnabled(true);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User enabled successfully", UserResponse.fromUser(saved)));
    }

    @Operation(summary = "Admin updates a user's role or enabled status")
    @PutMapping("/users/{userId}/access")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserAccess(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserAccessRequest request
    ) {
        User user = getUserOrThrow(userId);

        if (request.getRole() != null) {
            validateRoleChange(user, request.getRole());
            user.setRole(request.getRole());
        }
        if (Boolean.FALSE.equals(request.getEnabled())) {
            validateDisable(user);
        }
        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User access updated successfully", UserResponse.fromUser(saved)));
    }

    private void validateDisable(User targetUser) {
        User currentUser = getCurrentAdmin();
        if (currentUser.getId().equals(targetUser.getId())) {
            throw new BadRequestException("Admin cannot disable their own account");
        }
    }

    private void validateRoleChange(User targetUser, User.Role newRole) {
        if (newRole == null) {
            throw new BadRequestException("Role is required");
        }

        if (targetUser.getRole() == User.Role.ADMIN && newRole != User.Role.ADMIN) {
            long adminCount = userRepository.countByRole(User.Role.ADMIN);
            if (adminCount <= 1) {
                throw new BadRequestException("Cannot change the last admin to a non-admin role");
            }
        }
    }

    private User getCurrentAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication.getPrincipal();
        String username = principal instanceof UserDetails userDetails
                ? userDetails.getUsername()
                : authentication.getName();

        return userRepository.findByEmail(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new BadRequestException("Current admin not found"));
    }

    private User getUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthCheckResponse {
        private String name;
        private List<String> authorities;
        private boolean authenticated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminDashboardResponse {
        private long totalUsers;
        private long totalAdmins;
        private long totalStaff;
        private long totalMembers;
        private long enabledUsers;
        private long disabledUsers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateUserRoleRequest {
        private User.Role role;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateUserAccessRequest {
        private User.Role role;
        private Boolean enabled;
    }
}
