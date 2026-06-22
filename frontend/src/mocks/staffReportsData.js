/**
 * Dữ liệu mock cho module "Báo cáo cơ bản (Staff)".
 * Schema backend để `data` dạng map tự do (additionalProp), nên mình tự định
 * nghĩa cấu trúc rõ ràng cho từng báo cáo để UI dựng số liệu & biểu đồ.
 * Khi backend chốt schema, chỉ cần ánh xạ lại trong service/UI.
 */

const DAILY = [
  { date: '2026-06-15', cinema: 5200000, online: 1800000 },
  { date: '2026-06-16', cinema: 4800000, online: 2100000 },
  { date: '2026-06-17', cinema: 6100000, online: 1500000 },
  { date: '2026-06-18', cinema: 7300000, online: 2600000 },
  { date: '2026-06-19', cinema: 8900000, online: 3100000 },
  { date: '2026-06-20', cinema: 9500000, online: 2800000 },
  { date: '2026-06-21', cinema: 6700000, online: 2400000 },
];

const sum = (arr, key) => arr.reduce((a, b) => a + (b[key] || 0), 0);

/** GET /reports/revenue — doanh thu theo ngày + tách rạp / online */
export const buildRevenue = () => {
  const cinemaTotal = sum(DAILY, 'cinema');
  const onlineTotal = sum(DAILY, 'online');
  return {
    totalRevenue: cinemaTotal + onlineTotal,
    cinemaRevenue: cinemaTotal,
    onlineRevenue: onlineTotal,
    daily: DAILY.map((d) => ({ date: d.date, cinema: d.cinema, online: d.online, total: d.cinema + d.online })),
  };
};

/** GET /reports/ticket-sales — số vé bán theo ngày */
export const buildTicketSales = () => {
  const daily = [
    { date: '2026-06-15', tickets: 58 },
    { date: '2026-06-16', tickets: 52 },
    { date: '2026-06-17', tickets: 67 },
    { date: '2026-06-18', tickets: 81 },
    { date: '2026-06-19', tickets: 99 },
    { date: '2026-06-20', tickets: 105 },
    { date: '2026-06-21', tickets: 74 },
  ];
  return { totalTickets: sum(daily, 'tickets'), daily };
};

/** GET /reports/online-movie-sales — số lượt xem phim online theo ngày */
export const buildOnlineMovieSales = () => {
  const daily = [
    { date: '2026-06-15', views: 30 },
    { date: '2026-06-16', views: 35 },
    { date: '2026-06-17', views: 25 },
    { date: '2026-06-18', views: 43 },
    { date: '2026-06-19', views: 52 },
    { date: '2026-06-20', views: 47 },
    { date: '2026-06-21', views: 40 },
  ];
  return { totalViews: sum(daily, 'views'), totalRevenue: sum(DAILY, 'online'), daily };
};

/** GET /reports/top-movies — top phim bán chạy */
export const buildTopMovies = () => ({
  items: [
    { movieTitle: 'Bố Già', tickets: 210, revenue: 25200000 },
    { movieTitle: 'Đất Rừng Phương Nam', tickets: 175, revenue: 15750000 },
    { movieTitle: 'The Flash', tickets: 132, revenue: 13200000 },
    { movieTitle: 'Mai', tickets: 98, revenue: 9800000 },
  ],
});

/** GET /reports/top-showtimes — top suất chiếu đông khách */
export const buildTopShowtimes = () => ({
  items: [
    { movieTitle: 'Bố Già', room: 'Phòng Fly', startTime: '2026-06-20T19:30:00.000Z', sold: 95, capacity: 100 },
    { movieTitle: 'Đất Rừng Phương Nam', room: 'Phòng VIP', startTime: '2026-06-19T20:00:00.000Z', sold: 72, capacity: 80 },
    { movieTitle: 'The Flash', room: 'Căn Phòng Hạnh Phúc', startTime: '2026-06-21T18:15:00.000Z', sold: 80, capacity: 100 },
    { movieTitle: 'Mai', room: 'Phòng Fly', startTime: '2026-06-18T21:00:00.000Z', sold: 64, capacity: 100 },
  ],
});
