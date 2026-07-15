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
    private UUID shiftAssignmentId;
    private String shiftType;
    private String shiftName;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;
    private long durationMinutes;
    private long lateMinutes;
    private long earlyLeaveMinutes;
    private String checkInMethod;
    private String checkOutMethod;
    private String status;
    private String note;
}
