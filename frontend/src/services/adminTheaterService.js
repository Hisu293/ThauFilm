import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Các field hợp lệ cho POST/PUT /api/admin/theaters */
export const THEATER_FIELDS = [
  'name',
  'address',
  'city',
  'phoneNumber',
  'status',
];

/** Chỉ giữ lại các field backend nhận. */
export const toTheaterPayload = (form) => {
  const payload = {};
  for (const key of THEATER_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  if (form.status !== undefined) payload.status = Number(form.status);
  return payload;
};

export const adminTheaterService = {
  /** GET /api/admin/theaters — danh sách rạp */
  list: () => api.get('/api/admin/theaters').then(unwrap),

  /** GET /api/admin/theaters/{theaterId} — chi tiết 1 rạp */
  getById: (theaterId) => api.get(`/api/admin/theaters/${theaterId}`).then(unwrap),

  /** POST /api/admin/theaters — tạo rạp mới */
  create: (form) => api.post('/api/admin/theaters', toTheaterPayload(form)).then(unwrap),

  /** PUT /api/admin/theaters/{theaterId} — cập nhật rạp */
  update: (theaterId, form) => api.put(`/api/admin/theaters/${theaterId}`, toTheaterPayload(form)).then(unwrap),

  /** DELETE /api/admin/theaters/{theaterId} — xóa rạp */
  remove: (theaterId) => api.delete(`/api/admin/theaters/${theaterId}`).then(unwrap),
};

export default adminTheaterService;
