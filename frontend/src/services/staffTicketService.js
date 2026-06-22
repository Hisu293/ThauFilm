import api from './api';

/**
 * Service cho module "Quản lý vé (Staff)".
 * Nghiệp vụ: xem danh sách vé, thông tin khách, kiểm tra thanh toán,
 * hủy vé theo chính sách, check-in bằng QR, in lại vé.
 *
 * Endpoint backend:
 *   GET  /api/staff/tickets
 *   GET  /api/staff/tickets/{ticketId}
 *   GET  /api/staff/tickets/{ticketId}/reprint
 *   GET  /api/staff/tickets/{ticketId}/payment
 *   POST /api/staff/tickets/check-in
 *   PUT  /api/staff/tickets/{ticketId}/cancel
 */

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const staffTicketService = {
  /** GET /api/staff/tickets — danh sách vé */
  list: () => api.get('/api/staff/tickets').then(unwrap),

  /** GET /api/staff/tickets/{ticketId} — chi tiết vé (kèm thông tin khách) */
  getById: (ticketId) => api.get(`/api/staff/tickets/${ticketId}`).then(unwrap),

  /** GET /api/staff/tickets/{ticketId}/payment — kiểm tra thanh toán */
  getPayment: (ticketId) => api.get(`/api/staff/tickets/${ticketId}/payment`).then(unwrap),

  /** GET /api/staff/tickets/{ticketId}/reprint — lấy dữ liệu in lại vé */
  reprint: (ticketId) => api.get(`/api/staff/tickets/${ticketId}/reprint`).then(unwrap),

  /** POST /api/staff/tickets/check-in — check-in vé bằng mã/QR (backend nhận @RequestParam) */
  checkIn: (ticketCode) =>
    api.post('/api/staff/tickets/check-in', null, { params: { ticketCode } }).then(unwrap),

  /** PUT /api/staff/tickets/{ticketId}/cancel — hủy vé */
  cancel: (ticketId) => api.put(`/api/staff/tickets/${ticketId}/cancel`).then(unwrap),
};

export default staffTicketService;
