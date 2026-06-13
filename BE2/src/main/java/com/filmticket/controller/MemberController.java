package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.dto.UserResponse;
import com.filmticket.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER', 'STAFF', 'ADMIN')")
public class MemberController {

    private final UserService userService;

    @Operation(summary = "Member test endpoint")
    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> ping() {
        return ResponseEntity.ok(ApiResponse.success("Member access granted", "MEMBER_OK"));
    }

    @Operation(summary = "Get current member profile")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        return ResponseEntity.ok(ApiResponse.success("Current member fetched successfully", userService.getCurrentUser()));
    }
}
