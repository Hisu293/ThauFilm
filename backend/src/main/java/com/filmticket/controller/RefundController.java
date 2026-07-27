package com.filmticket.controller;

import com.filmticket.dto.ApiResponse;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import com.filmticket.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class RefundController {
    private final RefundService refundService;
    private final UserRepository userRepository;

    @PostMapping("/{bookingId}/refund")
    public ApiResponse<RefundService.RefundResult> refund(@PathVariable UUID bookingId,
                                                          @RequestBody RefundBody body) {
        User user = currentUser();
        boolean admin = user.getRole() == User.Role.ADMIN;
        return ApiResponse.success("Đã tiếp nhận yêu cầu hoàn tiền tự động",
                refundService.refundBooking(bookingId, user.getId(), admin,
                        body.bankBin(), body.accountNumber(), body.reason()));
    }

    public record RefundBody(String bankBin, String accountNumber, String reason) {}

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof UserDetails details)) {
            throw new BadRequestException("Không xác định được người dùng đăng nhập");
        }
        return userRepository.findByEmail(details.getUsername())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
    }
}
