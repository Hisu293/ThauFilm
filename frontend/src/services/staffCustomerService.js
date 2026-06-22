import api from './api';

/**
 * Service cho module "Quản lý khách hàng (Staff)".
 * Nghiệp vụ: xem thông tin, lịch sử mua vé / phim online, khóa / mở khóa
 * tài khoản, hỗ trợ khiếu nại.
 *
 * Endpoint backend:
 *   GET  /api/staff/customers
 *   GET  /api/staff/customers/{id}
 *   GET  /api/staff/customers/{id}/online-movies
 *   GET  /api/staff/customers/{id}/bookings
 *   POST /api/staff/customers/{id}/complaints   (body: chuỗi thuần)
 *   PUT  /api/staff/customers/{id}/lock
 *   PUT  /api/staff/customers/{id}/unlock
 */

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const staffCustomerService = {
  /** GET /api/staff/customers — danh sách khách hàng */
  list: () => api.get('/api/staff/customers').then(unwrap),

  /** GET /api/staff/customers/{id} — chi tiết khách hàng */
  getById: (customerId) => api.get(`/api/staff/customers/${customerId}`).then(unwrap),

  /** GET /api/staff/customers/{id}/online-movies — lịch sử mua phim online */
  getOnlineMovies: (customerId) => api.get(`/api/staff/customers/${customerId}/online-movies`).then(unwrap),

  /** GET /api/staff/customers/{id}/bookings — lịch sử mua vé tại rạp */
  getBookings: (customerId) => api.get(`/api/staff/customers/${customerId}/bookings`).then(unwrap),

  /** POST /api/staff/customers/{id}/complaints — gửi khiếu nại (body là chuỗi) */
  sendComplaint: (customerId, content) =>
    api
      .post(`/api/staff/customers/${customerId}/complaints`, content, {
        headers: { 'Content-Type': 'text/plain' },
      })
      .then(unwrap),

  /** PUT /api/staff/customers/{id}/lock — khóa tài khoản */
  lock: (customerId) => api.put(`/api/staff/customers/${customerId}/lock`).then(unwrap),

  /** PUT /api/staff/customers/{id}/unlock — mở khóa tài khoản */
  unlock: (customerId) => api.put(`/api/staff/customers/${customerId}/unlock`).then(unwrap),
};

export default staffCustomerService;
