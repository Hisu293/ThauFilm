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
  revenue: () => api.get('/api/staff/reports/revenue').then(unwrap),
  ticketSales: () => api.get('/api/staff/reports/ticket-sales').then(unwrap),
  onlineMovieSales: () => api.get('/api/staff/reports/online-movie-sales').then(unwrap),
  topMovies: () => api.get('/api/staff/reports/top-movies').then(unwrap),
  topShowtimes: () => api.get('/api/staff/reports/top-showtimes').then(unwrap),
};

export default staffReportService;
