package com.filmticket.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffPromotionRequest {

    @NotBlank(message = "Mã khuyến mãi là bắt buộc")
    @Size(max = 50, message = "Mã khuyến mãi không được vượt quá 50 ký tự")
    private String code;

    @NotBlank(message = "Tên chương trình là bắt buộc")
    @Size(max = 100, message = "Tên chương trình không được vượt quá 100 ký tự")
    private String name;

    @NotBlank(message = "Loại khuyến mãi là bắt buộc")
    @Size(max = 20, message = "Loại khuyến mãi không hợp lệ")
    private String type;

    @NotNull(message = "Giá trị giảm là bắt buộc")
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá trị giảm không được âm")
    private BigDecimal value;

    @NotNull(message = "Giá trị đơn tối thiểu là bắt buộc")
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá trị đơn tối thiểu không được âm")
    private BigDecimal minPurchaseAmount;

    @NotNull(message = "Mức giảm tối đa là bắt buộc")
    @DecimalMin(value = "0.0", inclusive = true, message = "Mức giảm tối đa không được âm")
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private LocalDateTime validFrom;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    private LocalDateTime validTo;

    @Min(value = 1, message = "Tổng lượt sử dụng phải từ 1 trở lên")
    private Integer usageLimit;

    @Builder.Default
    private Boolean active = true;

    // Comma-separated seat types e.g. "STANDARD,VIP,COUPLE". Leave null to apply to all seat types.
    private String applicableSeatTypes;

    private String minimumMemberTier;
    private String customerSegment;
    private String applicableMovieIds;
    private String applicableGenres;
    private String applicableTheaterIds;
    private String applicableRoomIds;
    private String applicableShowtimeIds;
    private String applicableChannels;
    private String applicableWeekdays;
    private LocalTime startHour;
    private LocalTime endHour;

    @Min(value = 1, message = "Giới hạn mỗi thành viên phải từ 1 trở lên")
    private Integer perUserLimit;

    @DecimalMin(value = "0.0", inclusive = false, message = "Ngân sách chiến dịch phải lớn hơn 0")
    private BigDecimal budgetLimit;
}
