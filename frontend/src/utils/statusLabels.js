export const bookingStatusLabel = (status) => {
  const labels = {
    CONFIRMED: 'Đã thanh toán',
    HOLD: 'Đang giữ chỗ',
    PENDING: 'Chờ thanh toán',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Đã hết hạn',
  };
  return labels[String(status || '').toUpperCase()] || 'Chưa xác định';
};

export const paymentStatusLabel = (status) => {
  const labels = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Thanh toán thất bại',
    CANCELLED: 'Đã hủy thanh toán',
    REFUND_PENDING: 'Đang hoàn tiền',
    REFUNDED: 'Đã hoàn tiền',
    REFUND_FAILED: 'Hoàn tiền thất bại',
  };
  return labels[String(status || '').toUpperCase()] || 'Chưa xác định';
};

export const refundStatusLabel = (status) => {
  const labels = {
    REQUESTED: 'Nhân viên đang kiểm tra',
    PENDING_APPROVAL: 'Chờ quản trị viên duyệt',
    APPROVED: 'Đã hoàn tiền',
    REJECTED: 'Đã từ chối',
    REFUND_PENDING: 'Đang hoàn tiền',
    REFUND_FAILED: 'Hoàn tiền thất bại',
  };
  return labels[String(status || '').toUpperCase()] || 'Đang xử lý';
};

export const invitationStatusLabel = (status) => {
  const labels = {
    PENDING: 'Chờ phản hồi',
    ACCEPTED: 'Đã chấp nhận',
    DECLINED: 'Đã từ chối',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Đã hết hạn',
  };
  return labels[String(status || '').toUpperCase()] || 'Chưa xác định';
};
