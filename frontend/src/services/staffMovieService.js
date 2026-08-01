import api from './api';

/** Các field staff được phép cập nhật cho phim (khớp StaffMovieRequest backend). */
export const STAFF_MOVIE_FIELDS = [
  'title',
  'description',
  'durationMinutes',
  'updateFutureShowtimes',
  'rating',
  'active',
  'posterUrl',
  'trailerUrl',
  'director',
  'actors',
  'genre',
  'releaseDate',
  'language',
  'rated',
  'streamProvider',
  'streamKey',
  'status',
];

/**
 * Service cho module "Quản lý phim (Staff)".
 * Nhân viên chỉ được xem danh sách / chi tiết và cập nhật phim
 * (poster, trailer, mô tả, lịch phát hành...). Không tạo / xóa phim.
 *
 * Endpoint backend:
 *   GET  /api/staff/movies
 *   GET  /api/staff/movies/{movieId}
 *   PUT  /api/staff/movies/{movieId}
 */

/** Lấy phần `data` từ body chuẩn { success, message, data }. */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Chỉ giữ field backend nhận, ép kiểu số cho durationMinutes/rating, boolean cho active. */
export const toStaffMoviePayload = (form) => {
  const payload = {};
  for (const key of STAFF_MOVIE_FIELDS) {
    if (form[key] !== undefined) payload[key] = form[key];
  }
  if (payload.durationMinutes !== undefined && payload.durationMinutes !== '') {
    payload.durationMinutes = Number(payload.durationMinutes);
  }
  if (payload.rating !== undefined && payload.rating !== '') {
    payload.rating = Number(payload.rating);
  }
  if (form.active !== undefined) payload.active = Boolean(form.active);
  return payload;
};

export const staffMovieService = {
  /** GET /api/staff/movies — danh sách phim */
  list: () => api.get('/api/staff/movies').then(unwrap),

  /** GET /api/staff/movies/{movieId} — chi tiết 1 phim */
  getById: (movieId) => api.get(`/api/staff/movies/${movieId}`).then(unwrap),

  /** PUT /api/staff/movies/{movieId} — cập nhật phim */
  update: (movieId, form) =>
    api.put(`/api/staff/movies/${movieId}`, toStaffMoviePayload(form)).then(unwrap),
};

export default staffMovieService;
