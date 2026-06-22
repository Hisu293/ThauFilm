/**
 * Dữ liệu mock cho module "Quản lý khách hàng (Staff)".
 * Khớp schema backend GET /api/staff/customers.
 *
 * userId trùng với staffBookingsData để lịch sử mua vé / phim online khớp nhau.
 * Mảng là "DB trong bộ nhớ": lock/unlock ghi trực tiếp nên giữ nguyên trong phiên.
 */
import { staffBookingsDb } from './staffBookingsData';

export const staffCustomersDb = [
  {
    id: 'u1000000-0000-0000-0000-000000000001',
    email: 'an.nguyen@example.com',
    fullName: 'Nguyễn Văn An',
    phone: '0369654354',
    avatarUrl: '',
    role: 'CUSTOMER',
    provider: 'LOCAL',
    enabled: true,
  },
  {
    id: 'u1000000-0000-0000-0000-000000000002',
    email: 'binh.tran@example.com',
    fullName: 'Trần Thị Bình',
    phone: '0868686868',
    avatarUrl: '',
    role: 'CUSTOMER',
    provider: 'GOOGLE',
    enabled: true,
  },
  {
    id: 'u1000000-0000-0000-0000-000000000003',
    email: 'long.le@example.com',
    fullName: 'Lê Hoàng Long',
    phone: '0901234567',
    avatarUrl: '',
    role: 'CUSTOMER',
    provider: 'LOCAL',
    enabled: false, // tài khoản đang bị khóa
  },
];

/** Lịch sử đặt vé tại rạp của khách (lọc từ bookings theo userId). */
export const buildCustomerBookings = (customerId) => {
  const items = staffBookingsDb
    .filter((b) => b.userId === customerId)
    .map((b) => ({
      bookingId: b.id,
      confirmationCode: b.confirmationCode,
      movieTitle: b.movieTitle,
      cinemaRoomName: b.cinemaRoomName,
      startTime: b.startTime,
      totalAmount: b.totalAmount,
      status: b.status,
      seats: (b.seats || []).map((s) => `${s.rowName}${s.seatNumber}`).join(', '),
    }));
  return { customerId, total: items.length, bookings: items };
};

/** Lịch sử mua phim online của khách (mock — không phụ thuộc rạp). */
const ONLINE_LIBRARY = {
  'u1000000-0000-0000-0000-000000000001': [
    { movieTitle: 'Bố Già', purchasedAt: '2026-06-18T09:30:00.000Z', amount: 59000, accessGranted: true, expiresAt: '2026-07-18T09:30:00.000Z' },
  ],
  'u1000000-0000-0000-0000-000000000002': [
    { movieTitle: 'Đất Rừng Phương Nam', purchasedAt: '2026-06-15T14:00:00.000Z', amount: 59000, accessGranted: false, expiresAt: '2026-07-15T14:00:00.000Z' },
    { movieTitle: 'Mai', purchasedAt: '2026-05-30T20:10:00.000Z', amount: 49000, accessGranted: true, expiresAt: '2026-06-30T20:10:00.000Z' },
  ],
  'u1000000-0000-0000-0000-000000000003': [],
};

export const buildOnlineMovies = (customerId) => {
  const movies = ONLINE_LIBRARY[customerId] || [];
  return { customerId, total: movies.length, movies };
};

/** Kho khiếu nại của khách (post complaints sẽ push vào đây). */
export const customerComplaints = {};
