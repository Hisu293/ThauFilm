package com.filmticket.entity;

public enum BookingStatus {
    HOLD,       // Ghế đang được giữ, chờ thanh toán
    CONFIRMED,  // Đã thanh toán thành công
    EXPIRED,    // Hết thời gian giữ ghế
    CANCELLED   // Bị hủy bỏ
}
