/**
 * Nguồn dữ liệu chuẩn cho toàn bộ enum của backend.
 * Mọi nhãn tiếng Việt, màu sắc và danh sách tùy chọn (dropdown) đều lấy từ đây
 * để frontend luôn khớp với backend và đồng nhất giữa các màn hình.
 *
 * Tham chiếu enum backend:
 *   TheaterStatus / RoomStatus / SeatStatus : ACTIVE | INACTIVE | MAINTENANCE
 *   RoomType                                : STANDARD | VIP | IMAX | FOUR_DX
 *   SeatType                                : STANDARD | VIP | COUPLE
 *   SeatBookingStatus                       : AVAILABLE | HOLDING | BOOKED | SOLD
 *   ShowtimeStatus                          : SCHEDULED | OPEN | RUNNING | COMPLETED | CANCELLED
 */

// ── Trạng thái rạp / phòng / ghế (dùng chung) ───────────────────────────────
export const FACILITY_STATUS = {
  ACTIVE: { value: 'ACTIVE', label: 'Hoạt động', color: 'success' },
  INACTIVE: { value: 'INACTIVE', label: 'Ngừng hoạt động', color: 'default' },
  MAINTENANCE: { value: 'MAINTENANCE', label: 'Bảo trì', color: 'warning' },
};
export const FACILITY_STATUS_OPTIONS = Object.values(FACILITY_STATUS);

// ── Loại phòng chiếu ────────────────────────────────────────────────────────
export const ROOM_TYPE = {
  STANDARD: { value: 'STANDARD', label: 'Tiêu chuẩn', color: '#64748b' },
  VIP: { value: 'VIP', label: 'VIP', color: '#fbbf24' },
  IMAX: { value: 'IMAX', label: 'IMAX', color: '#22d3ee' },
  FOUR_DX: { value: 'FOUR_DX', label: '4DX', color: '#a78bfa' },
};
export const ROOM_TYPE_OPTIONS = Object.values(ROOM_TYPE);

// ── Loại ghế ────────────────────────────────────────────────────────────────
export const SEAT_TYPE = {
  STANDARD: { value: 'STANDARD', label: 'Ghế thường', color: '#64748b' },
  VIP: { value: 'VIP', label: 'Ghế VIP', color: '#8b5cf6' },
  COUPLE: { value: 'COUPLE', label: 'Ghế đôi', color: '#ec4899' },
};
export const SEAT_TYPE_OPTIONS = Object.values(SEAT_TYPE);

// ── Trạng thái đặt ghế (theo suất chiếu) ────────────────────────────────────
export const SEAT_BOOKING_STATUS = {
  AVAILABLE: { value: 'AVAILABLE', label: 'Trống', color: 'success' },
  HOLDING: { value: 'HOLDING', label: 'Đang giữ', color: 'warning' },
  BOOKED: { value: 'BOOKED', label: 'Đã đặt', color: 'info' },
  SOLD: { value: 'SOLD', label: 'Đã bán', color: 'default' },
};
export const SEAT_BOOKING_STATUS_OPTIONS = Object.values(SEAT_BOOKING_STATUS);

// ── Trạng thái suất chiếu ───────────────────────────────────────────────────
export const SHOWTIME_STATUS = {
  SCHEDULED: { value: 'SCHEDULED', label: 'Đã lên lịch', color: 'default' },
  OPEN: { value: 'OPEN', label: 'Đang mở bán', color: 'success' },
  RUNNING: { value: 'RUNNING', label: 'Đang chiếu', color: 'info' },
  COMPLETED: { value: 'COMPLETED', label: 'Đã hoàn thành', color: 'default' },
  CANCELLED: { value: 'CANCELLED', label: 'Đã hủy', color: 'error' },
};
export const SHOWTIME_STATUS_OPTIONS = Object.values(SHOWTIME_STATUS);

/**
 * Lấy nhãn tiếng Việt cho một giá trị enum bất kỳ.
 * @param {object} enumMap - một trong các map enum ở trên (vd: FACILITY_STATUS)
 * @param {string} value   - giá trị enum cần dịch
 * @returns {string} nhãn tiếng Việt, hoặc chính value nếu không khớp
 */
export const enumLabel = (enumMap, value) => enumMap[value]?.label ?? value ?? '—';

/**
 * Chuẩn hóa loại ghế cũ về đúng enum backend.
 * Các bản ghi/dữ liệu cũ có thể còn dùng "NORMAL" hoặc "DOUBLE".
 */
export const normalizeSeatType = (raw) => {
  const t = String(raw || 'STANDARD').toUpperCase();
  if (t === 'NORMAL') return 'STANDARD';
  if (t === 'DOUBLE') return 'COUPLE';
  return SEAT_TYPE[t] ? t : 'STANDARD';
};
