package com.filmticket.dto;

import com.filmticket.model.ShowtimeStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertShowtimeRequest {
    @NotNull(message = "Mã phim là bắt buộc")
    private UUID movieId;

    private UUID cinemaRoomId;

    @NotNull(message = "Giờ bắt đầu là bắt buộc")
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @NotNull(message = "Trạng thái là bắt buộc")
    private ShowtimeStatus status;

    private Boolean online;

    @DecimalMin(value = "1000", message = "Giá vé online phải từ 1.000 đồng")
    private BigDecimal onlinePrice;

    private Boolean mystery;

    private LocalDateTime mysteryUnlockAt;
}
