import api from './api';

/** Bóc phần `data` từ body chuẩn { success, message, data } của backend. */
const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Vai trò hệ thống (khớp với dashboard: Admin / Staff / Member). */
export const USER_ROLES = ['ADMIN', 'STAFF', 'MEMBER'];

/**
 * Kiểm tra payload của /api/admin/auth-check có phải admin hợp lệ không.
 * data: { name, authorities: string[], authenticated: boolean }
 */
export const isAdminAuth = (data) => {
  if (!data?.authenticated) return false;
  const authorities = Array.isArray(data.authorities) ? data.authorities : [];
  return authorities.some((a) => String(a).toUpperCase().includes('ADMIN'));
};

export const adminService = {
  /** GET /api/admin/auth-check — kiểm tra quyền admin của phiên hiện tại */
  authCheck: () => api.get('/api/admin/auth-check').then(unwrap),

  /** GET /api/admin/dashboard — số liệu tổng quan */
  getDashboard: () => api.get('/api/admin/dashboard').then(unwrap),

  /** GET /api/admin/me — hồ sơ admin đang đăng nhập */
  getMe: () => api.get('/api/admin/me').then(unwrap),

  /** GET /api/admin/users — danh sách người dùng */
  listUsers: () => api.get('/api/admin/users').then(unwrap),

  /** GET /api/admin/users/{userId} — chi tiết 1 người dùng */
  getUser: (userId) => api.get(`/api/admin/users/${userId}`).then(unwrap),

  /** PUT /api/admin/users/{userId}/role — đổi vai trò */
  setRole: (userId, role) => api.put(`/api/admin/users/${userId}/role`, { role }).then(unwrap),

  /** PUT /api/admin/users/{userId}/enable — mở khóa tài khoản */
  enableUser: (userId) => api.put(`/api/admin/users/${userId}/enable`).then(unwrap),

  /** PUT /api/admin/users/{userId}/disable — khóa tài khoản */
  disableUser: (userId) => api.put(`/api/admin/users/${userId}/disable`).then(unwrap),

  /** PUT /api/admin/users/{userId}/access — đổi vai trò + trạng thái cùng lúc */
  updateAccess: (userId, { role, enabled }) =>
    api.put(`/api/admin/users/${userId}/access`, { role, enabled }).then(unwrap),

  getAttendance: (year, month) =>
    api.get('/api/admin/attendance', { params: { year, month } }).then(unwrap),

  updateAttendance: (attendanceId, payload) =>
    api.put(`/api/admin/attendance/${attendanceId}`, payload).then(unwrap),

  getMonthlyRevenue: (year, month) =>
    api.get('/api/admin/reports/revenue/monthly', { params: { year, month } }).then(unwrap),
  getMonthlyTickets: (year, month) =>
    api.get('/api/admin/reports/tickets/monthly', { params: { year, month } }).then(unwrap),
  getMonthlyCustomers: (year, month) =>
    api.get('/api/admin/reports/customers/monthly', { params: { year, month } }).then(unwrap),

  getWorkforceStaff: () => api.get('/api/admin/workforce/staff').then(unwrap),
  getShiftSchedule: (year, month) => api.get('/api/admin/workforce/shifts', { params: { year, month } }).then(unwrap),
  assignShift: (payload) => api.post('/api/admin/workforce/shifts', payload).then(unwrap),
  deleteShift: (assignmentId) => api.delete(`/api/admin/workforce/shifts/${assignmentId}`),
  updateEmploymentProfile: (staffId, payload) => api.put(`/api/admin/workforce/staff/${staffId}`, payload).then(unwrap),
  getPayroll: (year, month) => api.get('/api/admin/workforce/payroll', { params: { year, month } }).then(unwrap),
  updatePayroll: (payrollId, payload) => api.put(`/api/admin/workforce/payroll/${payrollId}`, payload).then(unwrap),
  updateShiftStatus: (assignmentId, status) => api.put(`/api/admin/workforce/shifts/${assignmentId}/status`, { status }).then(unwrap),
  generateAttendanceCode: (payload) => api.post('/api/admin/workforce/attendance-codes', payload).then(unwrap),
  getAttendanceCode: (workDate, shiftType) => api.get('/api/admin/workforce/attendance-codes', { params: { workDate, shiftType } }).then(unwrap),
  getInventoryForecast: () => api.get('/api/admin/inventory/forecast').then(unwrap),
  getInventoryRecipes: () => api.get('/api/admin/inventory/recipes').then(unwrap),
  getInventoryCombos: () => api.get('/api/admin/inventory/combos').then(unwrap),
  createInventoryItem: (payload) => api.post('/api/admin/inventory/items', payload).then(unwrap),
  updateInventoryItem: (id, payload) => api.put(`/api/admin/inventory/items/${id}`, payload).then(unwrap),
  saveInventoryRecipe: (payload) => api.post('/api/admin/inventory/recipes', payload).then(unwrap),
};

export default adminService;
