/**
 * Dữ liệu mock cho module "Quản lý đơn hàng phim online (Staff)".
 * Khớp schema backend GET /api/staff/bookings.
 *
 * Mảng này là "DB trong bộ nhớ": cancel/refund/regrant ghi trực tiếp nên
 * dữ liệu giữ nguyên trong suốt phiên chạy.
 *
 * Các field ngoài schema (customer*, payment, accessGranted) dùng cho màn
 * hình hỗ trợ của staff — khi backend trả schema đầy đủ chỉ cần ánh xạ lại.
 */
export const staffBookingsDb = [
  {
    id: 'bk100000-0000-0000-0000-000000000001',
    userId: 'u1000000-0000-0000-0000-000000000001',
    showtimeId: 's1000000-0000-0000-0000-000000000003',
    movieTitle: 'Bố Già',
    cinemaRoomName: 'Phòng Fly',
    startTime: '2026-06-23T17:42:00.000Z',
    totalAmount: 240000,
    status: 'CONFIRMED',
    confirmationCode: 'BK733988',
    holdExpiresAt: null,
    confirmedAt: '2026-06-20T10:15:00.000Z',
    seats: [
      { seatId: 'st-c6', rowName: 'C', seatNumber: 6, type: 'STANDARD', status: 'SOLD', price: 120000 },
      { seatId: 'st-c7', rowName: 'C', seatNumber: 7, type: 'STANDARD', status: 'SOLD', price: 120000 },
    ],
    // mở rộng:
    customerName: 'Nguyễn Văn An',
    customerEmail: 'an.nguyen@example.com',
    customerPhone: '0369654354',
    accessGranted: true,
    payment: {
      method: 'Thẻ ngân hàng (ATM/Visa/Mastercard)',
      amount: 240000,
      status: 'PAID',
      paidAt: '2026-06-20T10:15:00.000Z',
      transactionId: 'TXN-9F2A77',
      history: [
        { at: '2026-06-20T10:14:30.000Z', action: 'Khởi tạo thanh toán', amount: 240000 },
        { at: '2026-06-20T10:15:00.000Z', action: 'Thanh toán thành công', amount: 240000 },
      ],
    },
  },
  {
    id: 'bk100000-0000-0000-0000-000000000002',
    userId: 'u1000000-0000-0000-0000-000000000002',
    showtimeId: 's1000000-0000-0000-0000-000000000001',
    movieTitle: 'Đất Rừng Phương Nam',
    cinemaRoomName: 'Phòng VIP',
    startTime: '2026-06-23T15:16:00.000Z',
    totalAmount: 90000,
    status: 'CONFIRMED',
    confirmationCode: 'BK512004',
    holdExpiresAt: null,
    confirmedAt: '2026-06-19T20:40:00.000Z',
    seats: [
      { seatId: 'st-a3', rowName: 'A', seatNumber: 3, type: 'VIP', status: 'SOLD', price: 90000 },
    ],
    customerName: 'Trần Thị Bình',
    customerEmail: 'binh.tran@example.com',
    customerPhone: '0868686868',
    accessGranted: false, // khách báo lỗi không xem được → staff cấp lại
    payment: {
      method: 'Ví điện tử (Momo/ZaloPay)',
      amount: 90000,
      status: 'PAID',
      paidAt: '2026-06-19T20:40:00.000Z',
      transactionId: 'TXN-5C1B02',
      history: [
        { at: '2026-06-19T20:39:30.000Z', action: 'Khởi tạo thanh toán', amount: 90000 },
        { at: '2026-06-19T20:40:00.000Z', action: 'Thanh toán thành công', amount: 90000 },
      ],
    },
  },
  {
    id: 'bk100000-0000-0000-0000-000000000003',
    userId: 'u1000000-0000-0000-0000-000000000003',
    showtimeId: 's1000000-0000-0000-0000-000000000002',
    movieTitle: 'The Flash',
    cinemaRoomName: 'Phòng Fly',
    startTime: '2026-06-21T13:19:00.000Z',
    totalAmount: 100000,
    status: 'PENDING',
    confirmationCode: 'BK998112',
    holdExpiresAt: '2026-06-21T13:09:00.000Z',
    confirmedAt: null,
    seats: [
      { seatId: 'st-d5', rowName: 'D', seatNumber: 5, type: 'STANDARD', status: 'HOLDING', price: 100000 },
    ],
    customerName: 'Lê Hoàng Long',
    customerEmail: 'long.le@example.com',
    customerPhone: '0901234567',
    accessGranted: false,
    payment: {
      method: 'Ví điện tử (Momo/ZaloPay)',
      amount: 100000,
      status: 'PENDING',
      paidAt: null,
      transactionId: null,
      history: [
        { at: '2026-06-21T13:04:00.000Z', action: 'Khởi tạo thanh toán', amount: 100000 },
      ],
    },
  },
];

/** Phim đã mua của khách (cho endpoint purchased-movies). */
export const buildPurchasedMovies = (userId) => {
  const items = staffBookingsDb
    .filter((b) => b.userId === userId && b.status !== 'CANCELLED')
    .map((b) => ({
      bookingId: b.id,
      confirmationCode: b.confirmationCode,
      movieTitle: b.movieTitle,
      startTime: b.startTime,
      accessGranted: b.accessGranted,
      amount: b.totalAmount,
    }));
  return { userId, total: items.length, movies: items };
};

/** Chỉ lấy đúng field theo schema backend (loại bỏ field hiển thị mở rộng). */
export const toBookingDto = (b) => ({
  id: b.id,
  userId: b.userId,
  showtimeId: b.showtimeId,
  movieTitle: b.movieTitle,
  cinemaRoomName: b.cinemaRoomName,
  startTime: b.startTime,
  totalAmount: b.totalAmount,
  status: b.status,
  confirmationCode: b.confirmationCode,
  holdExpiresAt: b.holdExpiresAt,
  confirmedAt: b.confirmedAt,
  seats: b.seats,
});
