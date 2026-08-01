package com.filmticket.dto;

import com.filmticket.model.RoomType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoomRequest {
    @NotBlank(message = "Tên phòng là bắt buộc")
    private String name;

    private RoomType type;

    @NotNull(message = "Rạp chiếu là bắt buộc")
    private java.util.UUID theaterId;

    @NotNull(message = "Số hàng ghế là bắt buộc")
    @Min(value = 1, message = "Số hàng ghế phải lớn hơn 0")
    private Integer rowsCount;

    @NotNull(message = "Số ghế mỗi hàng là bắt buộc")
    @Min(value = 1, message = "Số ghế mỗi hàng phải lớn hơn 0")
    private Integer seatsPerRow;

    @Min(0)
    private Integer standardSeats;
    @Min(0)
    private Integer vipSeats;
    @Min(0)
    private Integer coupleSeats;

    private BigDecimal standardPrice;
    private BigDecimal vipPrice;
    private BigDecimal couplePrice;
}
