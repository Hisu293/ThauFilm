import api from './api';
import { toBackendLocalDateTime, fromUTCToLocal } from './adminShowtimeService';

/**
 * Service cho module "Quản lý suất chiếu (Staff)".
 * Nghiệp vụ: tạo suất, cập nhật giờ chiếu, phân phòng, hủy suất,
 * theo dõi tình trạng ghế và số vé đã bán.
 *
 * Endpoint backend:
 *   GET    /api/staff/showtimes
 *   GET    /api/staff/showtimes/{showtimeId}/seats
 *   POST   /api/staff/showtimes
 *   PUT    /api/staff/showtimes/{showtimeId}
 *   DELETE /api/staff/showtimes/{showtimeId}
 *
 * Danh mục cho dropdown (đều là API thật, không còn dữ liệu mock):
 *   GET /api/staff/movies            -> phim
 *   GET /api/theaters                -> rạp
 *   GET /api/theaters/{id}/rooms     -> phòng chiếu theo rạp
 */

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const STAFF_SHOWTIME_FIELDS = ['movieId', 'cinemaRoomId', 'startTime', 'endTime', 'status', 'online', 'mystery', 'mysteryUnlockAt'];

/** Chuyển form (datetime-local) → payload backend. */
export const toShowtimePayload = (form) => {
  const payload = {};
  if (form.movieId) payload.movieId = String(form.movieId);
  if (form.cinemaRoomId) payload.cinemaRoomId = String(form.cinemaRoomId);
  if (form.startTime) payload.startTime = toBackendLocalDateTime(form.startTime);
  if (form.endTime) payload.endTime = toBackendLocalDateTime(form.endTime);
  if (form.status) payload.status = form.status;
  payload.online = Boolean(form.online);
  payload.mystery = Boolean(form.mystery);
  if (form.mysteryUnlockAt) payload.mysteryUnlockAt = toBackendLocalDateTime(form.mysteryUnlockAt);
  return payload;
};

export const staffShowtimeService = {
  /** GET /api/staff/showtimes — danh sách suất chiếu */
  list: () => api.get('/api/staff/showtimes').then(unwrap),

  /** GET /api/staff/showtimes/{showtimeId}/seats — sơ đồ ghế + tình trạng */
  getSeats: (showtimeId) => api.get(`/api/staff/showtimes/${showtimeId}/seats`).then(unwrap),

  /** POST /api/staff/showtimes — tạo suất chiếu */
  create: (form) => api.post('/api/staff/showtimes', toShowtimePayload(form)).then(unwrap),

  /** PUT /api/staff/showtimes/{showtimeId} — cập nhật giờ/phòng/trạng thái */
  update: (showtimeId, form) =>
    api.put(`/api/staff/showtimes/${showtimeId}`, toShowtimePayload(form)).then(unwrap),

  /** DELETE /api/staff/showtimes/{showtimeId} — hủy/xóa suất chiếu */
  remove: (showtimeId) => api.delete(`/api/staff/showtimes/${showtimeId}`).then(unwrap),

  /**
   * GET /api/staff/movies — danh sách phim cho dropdown.
   * Chỉ giữ { id, title } để hiển thị trong combobox.
   */
  getMovies: async () => {
    const movies = await api.get('/api/staff/movies').then(unwrap);
    return (Array.isArray(movies) ? movies : []).map((m) => ({ id: m.id, title: m.title }));
  },

  /**
   * GET /api/theaters — danh sách rạp cho dropdown.
   * Endpoint này cho phép role STAFF/ADMIN/MEMBER.
   */
  getTheaters: async () => {
    const theaters = await api.get('/api/theaters').then(unwrap);
    return (Array.isArray(theaters) ? theaters : []).map((t) => ({
      id: t.id,
      name: t.name,
      city: t.city,
      address: t.address,
    }));
  },

  /**
   * Danh sách phòng chiếu (kèm theaterId để UI map phòng → rạp).
   * Backend chưa có endpoint "tất cả phòng" cho staff, nên gom phòng theo
   * từng rạp qua GET /api/theaters/{theaterId}/rooms.
   */
  getRooms: async () => {
    const theaters = await api.get('/api/theaters').then(unwrap);
    const list = Array.isArray(theaters) ? theaters : [];
    const roomsPerTheater = await Promise.all(
      list.map((t) =>
        api
          .get(`/api/theaters/${t.id}/rooms`)
          .then(unwrap)
          .then((rooms) => (Array.isArray(rooms) ? rooms : []))
          .catch(() => []),
      ),
    );
    return roomsPerTheater.flat().map((r) => ({
      id: r.id,
      name: r.name,
      theaterId: r.theaterId,
      type: r.type,
      capacity: r.capacity,
    }));
  },
};

export { fromUTCToLocal };
export default staffShowtimeService;
