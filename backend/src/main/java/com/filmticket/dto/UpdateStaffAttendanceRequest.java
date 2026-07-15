package com.filmticket.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateStaffAttendanceRequest {
    private LocalDateTime checkInAt;
    private LocalDateTime checkOutAt;
    private String note;
}
