import api from './api';

/**
 * Lấy phần `data` từ body chuẩn { success, message, data } của backend.
 * Nếu backend trả thẳng object/array thì dùng luôn.
 */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const adminSeatService = {
  /** GET /api/admin/theaters/{theaterId}/rooms/{roomId}/seats — lấy sơ đồ ghế của phòng */
  getByRoom: (theaterId, roomId) => api.get(`/api/admin/theaters/${theaterId}/rooms/${roomId}/seats`).then(unwrap),

  /** GET /api/admin/seats/{seatId} — chi tiết 1 ghế */
  getById: (seatId) => api.get(`/api/admin/seats/${seatId}`).then(unwrap),

  /** PUT /api/admin/seats/{seatId} — cập nhật ghế (loại ghế, trạng thái) */
  update: (seatId, payload) => api.put(`/api/admin/seats/${seatId}`, payload).then(unwrap),
};

export default adminSeatService;
