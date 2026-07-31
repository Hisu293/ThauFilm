package com.filmticket.service;

import com.filmticket.entity.AuditLog.AuditCategory;
import com.filmticket.entity.AuditLog.AuditSeverity;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AuditAction {
    AUTH_LOGIN_SUCCEEDED(AuditCategory.AUTH, AuditSeverity.INFO, "Đăng nhập thành công"),
    AUTH_LOGIN_FAILED(AuditCategory.AUTH, AuditSeverity.WARNING, "Đăng nhập thất bại"),
    AUTH_GOOGLE_LOGIN_SUCCEEDED(AuditCategory.AUTH, AuditSeverity.INFO, "Đăng nhập Google thành công"),
    AUTH_LOGOUT(AuditCategory.AUTH, AuditSeverity.INFO, "Đăng xuất"),
    PASSWORD_CHANGED(AuditCategory.AUTH, AuditSeverity.INFO, "Đổi mật khẩu"),
    PASSWORD_RESET_REQUESTED(AuditCategory.AUTH, AuditSeverity.WARNING, "Yêu cầu đặt lại mật khẩu"),
    PASSWORD_RESET_COMPLETED(AuditCategory.AUTH, AuditSeverity.WARNING, "Hoàn tất đặt lại mật khẩu"),
    REFRESH_TOKEN_REVOKED(AuditCategory.AUTH, AuditSeverity.WARNING, "Thu hồi token làm mới"),
    SUSPICIOUS_LOGIN_DETECTED(AuditCategory.AUTH, AuditSeverity.CRITICAL, "Phát hiện đăng nhập đáng ngờ"),

    USER_ROLE_CHANGED(AuditCategory.USER, AuditSeverity.CRITICAL, "Thay đổi quyền người dùng"),
    USER_ACCESS_CHANGED(AuditCategory.USER, AuditSeverity.CRITICAL, "Thay đổi trạng thái truy cập người dùng"),
    ACCOUNT_LOCKED(AuditCategory.USER, AuditSeverity.CRITICAL, "Khóa tài khoản"),
    ACCOUNT_UNLOCKED(AuditCategory.USER, AuditSeverity.WARNING, "Mở khóa tài khoản"),
    CUSTOMER_PROFILE_UPDATED_BY_STAFF(AuditCategory.USER, AuditSeverity.WARNING, "Nhân viên cập nhật hồ sơ khách hàng"),
    CUSTOMER_DATA_ANONYMIZED(AuditCategory.USER, AuditSeverity.CRITICAL, "Ẩn danh dữ liệu khách hàng"),
    CUSTOMER_ACCOUNT_DELETED(AuditCategory.USER, AuditSeverity.CRITICAL, "Xóa tài khoản khách hàng"),

    MOVIE_CREATED(AuditCategory.MOVIE, AuditSeverity.INFO, "Tạo phim"),
    MOVIE_UPDATED(AuditCategory.MOVIE, AuditSeverity.INFO, "Cập nhật phim"),
    MOVIE_DELETED(AuditCategory.MOVIE, AuditSeverity.CRITICAL, "Xóa phim"),
    MOVIE_STATUS_CHANGED(AuditCategory.MOVIE, AuditSeverity.WARNING, "Thay đổi trạng thái phim"),
    STREAM_SOURCE_CHANGED(AuditCategory.STREAMING, AuditSeverity.CRITICAL, "Thay đổi nguồn phim online"),
    STREAM_SOURCE_DELETED(AuditCategory.STREAMING, AuditSeverity.CRITICAL, "Xóa nguồn phim online"),

    THEATER_CREATED(AuditCategory.THEATER, AuditSeverity.INFO, "Tạo rạp"),
    THEATER_UPDATED(AuditCategory.THEATER, AuditSeverity.INFO, "Cập nhật rạp"),
    THEATER_DELETED(AuditCategory.THEATER, AuditSeverity.CRITICAL, "Xóa rạp"),
    CINEMA_ROOM_CREATED(AuditCategory.ROOM, AuditSeverity.INFO, "Tạo phòng chiếu"),
    CINEMA_ROOM_UPDATED(AuditCategory.ROOM, AuditSeverity.INFO, "Cập nhật phòng chiếu"),
    CINEMA_ROOM_DELETED(AuditCategory.ROOM, AuditSeverity.CRITICAL, "Xóa phòng chiếu"),
    ROOM_SEAT_LAYOUT_CHANGED(AuditCategory.ROOM, AuditSeverity.WARNING, "Thay đổi sơ đồ ghế"),

    SHOWTIME_CREATED(AuditCategory.SHOWTIME, AuditSeverity.INFO, "Tạo lịch chiếu"),
    SHOWTIME_UPDATED(AuditCategory.SHOWTIME, AuditSeverity.WARNING, "Cập nhật lịch chiếu"),
    SHOWTIME_CANCELLED(AuditCategory.SHOWTIME, AuditSeverity.CRITICAL, "Hủy lịch chiếu"),
    SHOWTIME_DELETED(AuditCategory.SHOWTIME, AuditSeverity.CRITICAL, "Xóa lịch chiếu"),

    SEAT_TYPE_PRICE_CHANGED(AuditCategory.PRICING, AuditSeverity.WARNING, "Thay đổi giá loại ghế"),
    SHOWTIME_PRICE_OVERRIDE_UPDATED(AuditCategory.PRICING, AuditSeverity.WARNING, "Thay đổi giá riêng của suất chiếu"),
    COMBO_CREATED(AuditCategory.PRICING, AuditSeverity.INFO, "Tạo combo"),
    COMBO_UPDATED(AuditCategory.PRICING, AuditSeverity.WARNING, "Cập nhật combo"),
    COMBO_DELETED(AuditCategory.PRICING, AuditSeverity.CRITICAL, "Xóa combo"),
    VOUCHER_CREATED(AuditCategory.VOUCHER, AuditSeverity.INFO, "Tạo voucher"),
    VOUCHER_UPDATED(AuditCategory.VOUCHER, AuditSeverity.WARNING, "Cập nhật voucher"),
    VOUCHER_DELETED(AuditCategory.VOUCHER, AuditSeverity.CRITICAL, "Xóa voucher"),

    CINEMA_BOOKING_CREATED(AuditCategory.BOOKING, AuditSeverity.INFO, "Tạo đơn đặt vé tại rạp"),
    ONLINE_BOOKING_CREATED(AuditCategory.BOOKING, AuditSeverity.INFO, "Tạo đơn mua quyền xem online"),
    BOOKING_SEATS_UPDATED(AuditCategory.BOOKING, AuditSeverity.INFO, "Cập nhật ghế trong đơn đặt vé"),
    CINEMA_BOOKING_CANCELLED(AuditCategory.BOOKING, AuditSeverity.WARNING, "Hủy đơn đặt vé tại rạp"),
    ONLINE_BOOKING_CANCELLED(AuditCategory.BOOKING, AuditSeverity.WARNING, "Hủy đơn xem phim online"),
    BOOKING_EXPIRED(AuditCategory.BOOKING, AuditSeverity.INFO, "Đơn đặt vé hết hạn"),
    DUPLICATE_BOOKING_PREVENTED(AuditCategory.BOOKING, AuditSeverity.WARNING, "Ngăn đơn đặt vé trùng"),
    SEAT_CONFLICT_DETECTED(AuditCategory.BOOKING, AuditSeverity.WARNING, "Phát hiện xung đột ghế"),
    TICKET_CHECKED_IN(AuditCategory.TICKET, AuditSeverity.INFO, "Soát vé thành công"),
    TICKET_CHECK_IN_REJECTED(AuditCategory.TICKET, AuditSeverity.WARNING, "Từ chối soát vé"),
    TICKET_REPRINTED(AuditCategory.TICKET, AuditSeverity.WARNING, "In lại vé"),
    TICKET_CANCELLED(AuditCategory.TICKET, AuditSeverity.WARNING, "Hủy vé"),

    PAYMENT_CREATED(AuditCategory.PAYMENT, AuditSeverity.INFO, "Khởi tạo thanh toán"),
    PAYMENT_WEBHOOK_RECEIVED(AuditCategory.PAYMENT, AuditSeverity.INFO, "Tiếp nhận webhook thanh toán hợp lệ"),
    PAYMENT_SUCCEEDED(AuditCategory.PAYMENT, AuditSeverity.INFO, "Thanh toán thành công"),
    PAYMENT_FAILED(AuditCategory.PAYMENT, AuditSeverity.WARNING, "Thanh toán thất bại"),
    PAYMENT_AMOUNT_MISMATCH(AuditCategory.PAYMENT, AuditSeverity.CRITICAL, "Số tiền thanh toán không khớp"),
    PAYMENT_WEBHOOK_SIGNATURE_INVALID(AuditCategory.PAYMENT, AuditSeverity.CRITICAL, "Chữ ký webhook thanh toán không hợp lệ"),
    DUPLICATE_PAYMENT_DETECTED(AuditCategory.PAYMENT, AuditSeverity.WARNING, "Phát hiện thanh toán trùng"),
    REFUND_REQUESTED(AuditCategory.REFUND, AuditSeverity.INFO, "Yêu cầu hoàn tiền"),
    REFUND_DESTINATION_CONFIRMED(AuditCategory.REFUND, AuditSeverity.WARNING, "Xác nhận tài khoản nhận hoàn tiền"),
    REFUND_APPROVED(AuditCategory.REFUND, AuditSeverity.WARNING, "Phê duyệt hoàn tiền"),
    REFUND_REJECTED(AuditCategory.REFUND, AuditSeverity.WARNING, "Từ chối hoàn tiền"),
    REFUND_SUCCEEDED(AuditCategory.REFUND, AuditSeverity.INFO, "Hoàn tiền thành công"),
    REFUND_FAILED(AuditCategory.REFUND, AuditSeverity.CRITICAL, "Hoàn tiền thất bại"),
    REFUND_RECONCILIATION_MISMATCH(AuditCategory.REFUND, AuditSeverity.CRITICAL, "Sai lệch đối soát hoàn tiền"),

    ONLINE_ACCESS_GRANTED(AuditCategory.STREAMING, AuditSeverity.INFO, "Cấp quyền xem phim online"),
    ONLINE_ACCESS_REVOKED(AuditCategory.STREAMING, AuditSeverity.WARNING, "Thu hồi quyền xem phim online"),
    STREAM_DEVICE_REGISTERED(AuditCategory.STREAMING, AuditSeverity.INFO, "Đăng ký thiết bị xem phim online"),
    STREAM_DEVICE_REPLACED(AuditCategory.STREAMING, AuditSeverity.WARNING, "Thay thế thiết bị xem phim online"),
    STREAM_ACCESS_EXPIRED(AuditCategory.STREAMING, AuditSeverity.INFO, "Quyền xem phim online hết hạn"),
    CONCURRENT_STREAM_BLOCKED(AuditCategory.STREAMING, AuditSeverity.WARNING, "Chặn xem đồng thời trên nhiều thiết bị"),
    STREAM_STORAGE_UNAVAILABLE(AuditCategory.STREAMING, AuditSeverity.CRITICAL, "Kho lưu trữ phim online không khả dụng"),

    GROUP_BOOKING_CREATED(AuditCategory.GROUP_BOOKING, AuditSeverity.INFO, "Tạo đơn đặt vé nhóm"),
    GROUP_BOOKING_PAYMENT_COMPLETED(AuditCategory.GROUP_BOOKING, AuditSeverity.INFO, "Hoàn tất thanh toán đặt vé nhóm"),
    GROUP_BOOKING_CANCELLED(AuditCategory.GROUP_BOOKING, AuditSeverity.WARNING, "Hủy đặt vé nhóm"),
    WATCH_PARTY_CREATED(AuditCategory.WATCH_PARTY, AuditSeverity.INFO, "Tạo phòng xem chung"),
    WATCH_PARTY_MEMBER_REMOVED(AuditCategory.WATCH_PARTY, AuditSeverity.WARNING, "Xóa thành viên khỏi phòng xem chung"),
    WATCH_PARTY_CLOSED(AuditCategory.WATCH_PARTY, AuditSeverity.INFO, "Đóng phòng xem chung"),

    STAFF_CREATED(AuditCategory.WORKFORCE, AuditSeverity.WARNING, "Tạo nhân viên"),
    STAFF_PROFILE_UPDATED(AuditCategory.WORKFORCE, AuditSeverity.WARNING, "Cập nhật hồ sơ nhân viên"),
    STAFF_SHIFT_ASSIGNED(AuditCategory.WORKFORCE, AuditSeverity.INFO, "Phân ca nhân viên"),
    STAFF_SHIFT_REMOVED(AuditCategory.WORKFORCE, AuditSeverity.WARNING, "Xóa ca nhân viên"),
    STAFF_PAYROLL_UPDATED(AuditCategory.WORKFORCE, AuditSeverity.CRITICAL, "Cập nhật bảng lương"),
    INVENTORY_STOCK_ADJUSTED(AuditCategory.INVENTORY, AuditSeverity.WARNING, "Điều chỉnh tồn kho"),
    INVENTORY_ITEM_CREATED(AuditCategory.INVENTORY, AuditSeverity.INFO, "Tạo mặt hàng kho"),
    INVENTORY_ITEM_DISABLED(AuditCategory.INVENTORY, AuditSeverity.WARNING, "Ngừng sử dụng mặt hàng kho"),
    INVENTORY_RECIPE_CHANGED(AuditCategory.INVENTORY, AuditSeverity.WARNING, "Thay đổi định mức nguyên liệu"),

    REVIEW_DELETED_BY_MODERATOR(AuditCategory.MODERATION, AuditSeverity.WARNING, "Kiểm duyệt viên xóa đánh giá"),
    COMMUNITY_POST_DELETED_BY_MODERATOR(AuditCategory.MODERATION, AuditSeverity.WARNING, "Kiểm duyệt viên xóa bài viết"),
    USER_CONTENT_REPORTED(AuditCategory.MODERATION, AuditSeverity.WARNING, "Báo cáo nội dung người dùng"),
    USER_CONTENT_REPORT_RESOLVED(AuditCategory.MODERATION, AuditSeverity.INFO, "Xử lý báo cáo nội dung"),

    CUSTOMER_DATA_EXPORTED(AuditCategory.REPORT, AuditSeverity.CRITICAL, "Xuất dữ liệu khách hàng"),
    BOOKING_REPORT_EXPORTED(AuditCategory.REPORT, AuditSeverity.WARNING, "Xuất báo cáo đặt vé"),
    REVENUE_REPORT_EXPORTED(AuditCategory.REPORT, AuditSeverity.CRITICAL, "Xuất báo cáo doanh thu"),
    PAYROLL_REPORT_EXPORTED(AuditCategory.REPORT, AuditSeverity.CRITICAL, "Xuất báo cáo bảng lương"),
    AUDIT_LOG_EXPORTED(AuditCategory.REPORT, AuditSeverity.CRITICAL, "Xuất nhật ký hệ thống"),

    LOYALTY_POINTS_ADJUSTED(AuditCategory.LOYALTY, AuditSeverity.WARNING, "Điều chỉnh điểm thành viên"),
    LOYALTY_REWARD_REDEEMED(AuditCategory.LOYALTY, AuditSeverity.INFO, "Đổi phần thưởng thành viên"),
    SYSTEM_CONFIG_CHANGED(AuditCategory.SYSTEM, AuditSeverity.CRITICAL, "Thay đổi cấu hình hệ thống"),
    SYSTEM_MAINTENANCE_ENABLED(AuditCategory.SYSTEM, AuditSeverity.CRITICAL, "Bật chế độ bảo trì"),
    ADMIN_MANUAL_OVERRIDE(AuditCategory.SYSTEM, AuditSeverity.CRITICAL, "Quản trị viên can thiệp thủ công");

    private final AuditCategory category;
    private final AuditSeverity severity;
    private final String vietnameseLabel;
}
