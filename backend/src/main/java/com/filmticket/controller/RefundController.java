package com.filmticket.controller;

import com.filmticket.client.PayOSRefundClient;
import com.filmticket.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class RefundController {
    private final PayOSRefundClient payOSRefundClient;

    @GetMapping("/refund/automatic-availability")
    public ApiResponse<Map<String, Boolean>> automaticAvailability() {
        return ApiResponse.success("Trạng thái hoàn tiền tự động",
                Map.of("available", payOSRefundClient.isAvailable()));
    }

}
