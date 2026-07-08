package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.service.MemberIntelligenceService;
import com.filmticket.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/member/intelligence")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MEMBER','STAFF','ADMIN')")
public class MemberIntelligenceController {
    private final MemberIntelligenceService service;
    private final UserService userService;
    @GetMapping("/leaderboard") public ResponseEntity<ApiResponse<List<Map<String,Object>>>> leaderboard(){ return ResponseEntity.ok(ApiResponse.success("Leaderboard fetched",service.leaderboard())); }
    @GetMapping("/achievements") public ResponseEntity<ApiResponse<Map<String,Object>>> achievements(){ return ResponseEntity.ok(ApiResponse.success("Achievements fetched",service.achievements(userService.getCurrentUser().getId()))); }
    @PostMapping("/dating") public ResponseEntity<ApiResponse<Map<String,Object>>> dating(@RequestBody MemberIntelligenceService.DatingRequest request){ return ResponseEntity.ok(ApiResponse.success("Movie compatibility generated",service.dating(request))); }
}
