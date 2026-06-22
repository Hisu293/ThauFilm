import api from './api';

/**
 * Service cho module "Xác thực / phiên đăng nhập (Staff)".
 * Dùng để kiểm tra kết nối backend (ping) và lấy thông tin
 * nhân viên đang đăng nhập (me).
 *
 * Endpoint backend:
 *   GET  /api/staff/ping   -> data: string
 *   GET  /api/staff/me     -> data: { id, email, fullName, phone, avatarUrl, role, provider, enabled }
 */

/** Lấy phần `data` từ body chuẩn { success, message, data }. */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const staffAuthService = {
  /** GET /api/staff/ping — kiểm tra kết nối / quyền staff, trả về chuỗi */
  ping: () => api.get('/api/staff/ping').then(unwrap),

  /** GET /api/staff/me — thông tin nhân viên đang đăng nhập */
  getMe: () => api.get('/api/staff/me').then(unwrap),
};

export default staffAuthService;
