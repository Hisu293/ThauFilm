package com.filmticket.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class StaffAttendanceResponse {
    private UUID id;
    private UUID staffId;
    private String staffName;
    private String staffEmail;
    private LocalDate workDate;
    private LocalDateTime checkInAt;
    private LocalDateTime checkOutAt;
    private long durationMinutes;
    private String status;
    private String note;
}
