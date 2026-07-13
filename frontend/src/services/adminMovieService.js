import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Các field hợp lệ cho POST/PUT /api/admin/movies (loại bỏ id và field thừa). */
export const MOVIE_FIELDS = [
  'title',
  'description',
  'durationMinutes',
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

/** Chỉ giữ lại các field backend nhận, ép kiểu số cho durationMinutes/rating. */
export const toMoviePayload = (form) => {
  const payload = {};
  for (const key of MOVIE_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  if (payload.durationMinutes !== undefined) payload.durationMinutes = Number(payload.durationMinutes);
  if (payload.rating !== undefined) payload.rating = Number(payload.rating);
  if (form.active !== undefined) payload.active = Boolean(form.active);
  return payload;
};

export const adminMovieService = {
  /** GET /api/admin/movies — danh sách phim */
  list: () => api.get('/api/admin/movies').then(unwrap),

  /** GET /api/admin/movies/{movieId} — chi tiết 1 phim */
  getById: (movieId) => api.get(`/api/admin/movies/${movieId}`).then(unwrap),

  /** POST /api/admin/movies — tạo phim mới */
  create: (form) => api.post('/api/admin/movies', toMoviePayload(form)).then(unwrap),

  /** PUT /api/admin/movies/{movieId} — cập nhật phim */
  update: (movieId, form) => api.put(`/api/admin/movies/${movieId}`, toMoviePayload(form)).then(unwrap),

  /** DELETE /api/admin/movies/{movieId} — xóa phim */
  remove: (movieId) => api.delete(`/api/admin/movies/${movieId}`).then(unwrap),
};

export default adminMovieService;
