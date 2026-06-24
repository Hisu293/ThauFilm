import api from './api';

/**
 * Service cho module "Báo cáo cơ bản (Staff)".
 * Doanh thu (theo ngày, rạp, online), số vé bán, lượt xem online,
 * top phim bán chạy, top suất chiếu đông khách.
 *
 * Endpoint backend:
 *   GET /api/staff/reports/revenue
 *   GET /api/staff/reports/ticket-sales
 *   GET /api/staff/reports/online-movie-sales
 *   GET /api/staff/reports/top-movies
 *   GET /api/staff/reports/top-showtimes
 */

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const staffReportService = {
  dashboard: () => api.get('/api/staff/reports/dashboard').then(unwrap),
  customers: () => api.get('/api/staff/reports/customers').then(unwrap),
  revenue: (from, to) => api.get('/api/staff/reports/revenue', { params: { from, to } }).then(unwrap),
  ticketSales: (from, to) => api.get('/api/staff/reports/ticket-sales', { params: { from, to } }).then(unwrap),
  onlineMovieSales: (from, to) => api.get('/api/staff/reports/online-movie-sales', { params: { from, to } }).then(unwrap),
  topMovies: (limit = 10) => api.get('/api/staff/reports/top-movies', { params: { limit } }).then(unwrap),
  topShowtimes: (limit = 10) => api.get('/api/staff/reports/top-showtimes', { params: { limit } }).then(unwrap),
};

export default staffReportService;
