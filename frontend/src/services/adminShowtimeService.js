import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Các field hợp lệ cho POST /api/admin/showtimes */
export const SHOWTIME_FIELDS = [
  'movieId',
  'cinemaRoomId',
  'startTime',
  'endTime',
  'status',
];

/** Chuyển form → payload theo API backend */
export const toShowtimePayload = (form) => {
  const payload = {};
  for (const key of SHOWTIME_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  // Đảm bảo UUID string
  if (form.movieId !== undefined) payload.movieId = String(form.movieId);
  if (form.cinemaRoomId !== undefined) payload.cinemaRoomId = String(form.cinemaRoomId);
  // Backend uses LocalDateTime, so send local wall-clock time without timezone.
  if (form.startTime) payload.startTime = toBackendLocalDateTime(form.startTime);
  if (form.endTime) payload.endTime = toBackendLocalDateTime(form.endTime);
  // ShowtimeStatus là enum chuỗi: SCHEDULED | OPEN | RUNNING | COMPLETED | CANCELLED
  if (form.status !== undefined && form.status !== '') payload.status = form.status;
  return payload;
};

/** Chuyển datetime-local (YYYY-MM-DDTHH:mm) sang LocalDateTime cho backend */
export const toBackendLocalDateTime = (localDateTime) => {
  if (!localDateTime) return '';
  const [date, time = ''] = localDateTime.split('T');
  const [hour = '00', minute = '00', second = '00'] = time.split(':');
  return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
};

export const toISOWithVietnamTZ = toBackendLocalDateTime;

/** Alias cũ, giữ tương thích nhưng không đổi sang UTC nữa */
export const toISOUTC = (localDateTime) => {
  return toBackendLocalDateTime(localDateTime);
};

/** Chuyển ISO UTC string về datetime-local (YYYY-MM-DDTHH:mm) để hiển thị giờ Việt Nam */
export const fromUTCToLocal = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${vnTime.getFullYear()}-${pad(vnTime.getMonth() + 1)}-${pad(vnTime.getDate())}T${pad(vnTime.getHours())}:${pad(vnTime.getMinutes())}`;
  } catch {
    return '';
  }
};

/** Payload cho PUT /api/admin/showtimes/{id} — chỉ status (enum chuỗi) */
export const toShowtimeUpdatePayload = (form) => {
  const payload = {};
  if (form.status !== undefined && form.status !== '') payload.status = form.status;
  return payload;
};

export const adminShowtimeService = {
  /** Gợi ý 3 suất chiếu có nhu cầu dự kiến cao nhất trong 7 ngày tới. */
  suggestions: (movieId, fromDate) =>
    api.get('/api/admin/showtimes/suggestions', {
      params: { movieId, ...(fromDate ? { fromDate } : {}) },
    }).then(unwrap),

  /** GET /api/admin/showtimes — danh sách tất cả suất chiếu */
  list: () => api.get('/api/admin/showtimes').then(unwrap),

  /** POST /api/admin/showtimes — tạo suất chiếu mới */
  create: (form) => api.post('/api/admin/showtimes', toShowtimePayload(form)).then(unwrap),

  /** GET /api/admin/showtimes/{showtimeId} — chi tiết 1 suất chiếu */
  getById: (showtimeId) => api.get(`/api/admin/showtimes/${showtimeId}`).then(unwrap),

  /** PUT /api/admin/showtimes/{showtimeId} — cập nhật suất chiếu */
  update: (showtimeId, form) => api.put(`/api/admin/showtimes/${showtimeId}`, toShowtimePayload(form)).then(unwrap),

  /** PUT /api/admin/showtimes/{id} — chỉ cập nhật status */
  updateShowtime: (showtimeId, form) => api.put(`/api/admin/showtimes/${showtimeId}`, toShowtimeUpdatePayload(form)).then(unwrap),

  /** DELETE /api/admin/showtimes/{showtimeId} — xóa suất chiếu */
  remove: (showtimeId) => api.delete(`/api/admin/showtimes/${showtimeId}`).then(unwrap),

  /** GET /api/admin/showtimes/{showtimeId}/seats — lấy danh sách ghế của suất chiếu */
  getSeats: (showtimeId) => api.get(`/api/admin/showtimes/${showtimeId}/seats`).then(unwrap),

  /** PUT /api/admin/showtimes/{showtimeId}/seats — cập nhật trạng thái ghế (đặt/ghế trống) */
  updateSeats: (showtimeId, seats) => api.put(`/api/admin/showtimes/${showtimeId}/seats`, { seats }).then(unwrap),
};

export default adminShowtimeService;
