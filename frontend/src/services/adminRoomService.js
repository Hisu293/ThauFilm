import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data != null ? res.data.data : res?.data ?? res);

/** Các field hợp lệ cho POST/PUT /api/admin/cinema-rooms */
export const ROOM_FIELDS = [
  'name',
  'theaterId',
  'type',
  'rowsCount',
  'seatsPerRow',
  'standardSeats',
  'vipSeats',
  'coupleSeats',
  'standardPrice',
  'vipPrice',
  'couplePrice',
  'status',
];

/**
 * Chỉ giữ lại các field backend nhận.
 * status: ACTIVE | INACTIVE | MAINTENANCE — type: STANDARD | VIP | IMAX | FOUR_DX
 */
export const toRoomPayload = (form) => {
  const payload = {};
  for (const key of ROOM_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  if (form.rowsCount !== undefined) payload.rowsCount = Number(form.rowsCount);
  if (form.seatsPerRow !== undefined) payload.seatsPerRow = Number(form.seatsPerRow);
  for (const key of ['standardSeats', 'vipSeats', 'coupleSeats', 'standardPrice', 'vipPrice', 'couplePrice']) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = Number(form[key]);
  }
  return payload;
};

/** Payload cho PUT /api/admin/rooms/{id} — name + type + status */
export const toRoomUpdatePayload = (form) => {
  const payload = {};
  if (form.name !== undefined) payload.name = form.name;
  if (form.type !== undefined && form.type !== '') payload.type = form.type;
  if (form.status !== undefined) payload.status = form.status;
  return payload;
};

/** Các field hợp lệ cho POST/PUT /api/admin/rooms/seats */
export const SEAT_FIELDS = [
  'cinemaRoomId',
  'rowName',
  'seatNumber',
  'type',
  'status',
];

/** Chỉ giữ lại các field backend nhận. */
export const toSeatPayload = (form) => {
  const payload = {};
  for (const key of SEAT_FIELDS) {
    if (form[key] !== undefined && form[key] !== null) payload[key] = form[key];
  }
  if (form.cinemaRoomId !== undefined) payload.cinemaRoomId = Number(form.cinemaRoomId);
  if (form.seatNumber !== undefined) payload.seatNumber = Number(form.seatNumber);
  return payload;
};

export const adminRoomService = {
  // ========== ROOMS ==========

  /** GET /api/admin/rooms — danh sách tất cả phòng */
  list: () => api.get('/api/admin/rooms').then(unwrap),

  /** POST /api/admin/rooms — tạo phòng mới */
  create: (form) => api.post('/api/admin/rooms', toRoomPayload(form)).then(unwrap),

  /** GET /api/admin/rooms/{roomId} — chi tiết 1 phòng */
  getById: (roomId) => api.get(`/api/admin/rooms/${roomId}`).then(unwrap),

  /** PUT /api/admin/rooms/{roomId} — cập nhật phòng */
  update: (roomId, form) => api.put(`/api/admin/rooms/${roomId}`, toRoomPayload(form)).then(unwrap),

  /** PUT /api/admin/rooms/{roomId} — cập nhật name + status */
  updateRoom: (roomId, form) => api.put(`/api/admin/rooms/${roomId}`, toRoomUpdatePayload(form)).then(unwrap),

  /** DELETE /api/admin/rooms/{roomId} — xóa phòng */
  remove: (roomId) => api.delete(`/api/admin/rooms/${roomId}`).then(unwrap),

  /** GET /api/admin/rooms/{roomId}/seat-map — lấy thông tin hàng/ghế/tổng ghế của phòng */
  getSeatMap: (roomId) => api.get(`/api/admin/rooms/${roomId}/seat-map`).then(unwrap),

  // ========== SEATS ==========

  /** GET /api/admin/rooms/seats — danh sách tất cả ghế */
  listSeats: () => api.get('/api/admin/rooms/seats').then(unwrap),

  /** POST /api/admin/rooms/seats — tạo ghế mới */
  createSeat: (form) => api.post('/api/admin/rooms/seats', toSeatPayload(form)).then(unwrap),

  /** GET /api/admin/rooms/{cinemaRoomId}/seats — danh sách ghế theo phòng */
  getSeatsByRoom: (cinemaRoomId) => api.get(`/api/admin/rooms/${cinemaRoomId}/seats`).then(unwrap),

  /** GET /api/admin/rooms/seats/{id} — lấy chi tiết 1 ghế */
  getSeatById: (id) => api.get(`/api/admin/rooms/seats/${id}`).then(unwrap),

  /** PATCH /api/admin/rooms/seats/{id} — cập nhật ghế (type, status) */
  updateSeat: (seatId, form) => api.patch(`/api/admin/rooms/seats/${seatId}`, toSeatPayload(form)).then(unwrap),

  /** DELETE /api/admin/rooms/seats/{id} — xóa ghế */
  removeSeat: (seatId) => api.delete(`/api/admin/rooms/seats/${seatId}`).then(unwrap),
};

export default adminRoomService;
