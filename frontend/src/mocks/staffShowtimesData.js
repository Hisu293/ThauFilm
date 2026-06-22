/**
 * Dữ liệu mock cho module "Quản lý suất chiếu (Staff)".
 * Khớp schema backend GET/POST/PUT /api/staff/showtimes.
 *
 * Các mảng dưới đây là "DB trong bộ nhớ": POST/PUT/DELETE ghi trực tiếp
 * nên dữ liệu giữ nguyên trong suốt phiên chạy.
 */
import { staffMoviesDb } from './staffMoviesData';

// Rạp (theater) mẫu — staff chỉ thao tác suất chiếu trong các rạp này.
export const staffTheatersDb = [
  { id: 't1000000-0000-0000-0000-000000000001', name: 'Galaxy Nguyễn Huệ' },
  { id: 't1000000-0000-0000-0000-000000000002', name: 'Nơi lưu trữ phim hay nhất thế giới' },
];

// Phòng chiếu mẫu, gắn theaterId.
export const staffRoomsDb = [
  { id: 'r1000000-0000-0000-0000-000000000001', name: 'Phòng VIP', theaterId: 't1000000-0000-0000-0000-000000000001', totalSeats: 80, rowsCount: 8, seatsPerRow: 10 },
  { id: 'r1000000-0000-0000-0000-000000000002', name: 'Căn Phòng Hạnh Phúc', theaterId: 't1000000-0000-0000-0000-000000000001', totalSeats: 100, rowsCount: 10, seatsPerRow: 10 },
  { id: 'r1000000-0000-0000-0000-000000000003', name: 'Phòng Fly', theaterId: 't1000000-0000-0000-0000-000000000002', totalSeats: 100, rowsCount: 10, seatsPerRow: 10 },
];

const movie = (i) => staffMoviesDb[i] || staffMoviesDb[0];
const roomById = (id) => staffRoomsDb.find((r) => r.id === id);
const theaterName = (id) => staffTheatersDb.find((t) => t.id === id)?.name || '';

/** Tạo 1 bản ghi showtime đầy đủ field (đồng bộ tên phim/phòng/rạp từ id). */
export const buildShowtime = ({ id, movieId, cinemaRoomId, startTime, endTime, status = 'SCHEDULED' }) => {
  const m = staffMoviesDb.find((x) => x.id === movieId);
  const room = roomById(cinemaRoomId);
  return {
    id,
    movieId,
    movieTitle: m?.title || '',
    cinemaRoomId,
    cinemaRoomName: room?.name || '',
    theaterId: room?.theaterId || '',
    theaterName: room ? theaterName(room.theaterId) : '',
    startTime,
    endTime,
    status,
  };
};

export const staffShowtimesDb = [
  buildShowtime({
    id: 's1000000-0000-0000-0000-000000000001',
    movieId: movie(0).id,
    cinemaRoomId: staffRoomsDb[0].id,
    startTime: '2026-06-23T15:16:00.000Z',
    endTime: '2026-06-23T17:06:00.000Z',
    status: 'SCHEDULED',
  }),
  buildShowtime({
    id: 's1000000-0000-0000-0000-000000000002',
    movieId: movie(1).id,
    cinemaRoomId: staffRoomsDb[1].id,
    startTime: '2026-06-20T15:00:00.000Z',
    endTime: '2026-06-20T17:08:00.000Z',
    status: 'OPEN',
  }),
  buildShowtime({
    id: 's1000000-0000-0000-0000-000000000003',
    movieId: movie(2).id,
    cinemaRoomId: staffRoomsDb[2].id,
    startTime: '2026-06-21T13:19:00.000Z',
    endTime: '2026-06-21T15:43:00.000Z',
    status: 'RUNNING',
  }),
];

/**
 * Sinh sơ đồ ghế cho 1 suất chiếu (ổn định theo showtimeId để mỗi lần GET
 * trả cùng kết quả). Trả về { showtimeId, totalSeats, soldSeats, rows, seats }.
 */
const SEAT_STATUS = ['AVAILABLE', 'HOLDING', 'BOOKED', 'SOLD'];
export const buildSeatMap = (showtime) => {
  const room = roomById(showtime.cinemaRoomId);
  const rowsCount = room?.rowsCount || 8;
  const seatsPerRow = room?.seatsPerRow || 10;
  const rowLetters = 'ABCDEFGHIJKLMNOP'.slice(0, rowsCount).split('');

  // Hàm "ngẫu nhiên" tất định dựa trên chuỗi id (không dùng Math.random).
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h;
  };

  const seats = [];
  let sold = 0;
  rowLetters.forEach((row, ri) => {
    for (let n = 1; n <= seatsPerRow; n += 1) {
      const seed = hash(`${showtime.id}-${row}${n}`);
      // ~30% ghế đã có người (BOOKED/SOLD/HOLDING), còn lại AVAILABLE.
      let status = 'AVAILABLE';
      if (seed % 10 < 3) status = SEAT_STATUS[1 + (seed % 3)];
      if (status === 'SOLD' || status === 'BOOKED') sold += 1;
      seats.push({
        id: `${showtime.id}-${row}${n}`,
        rowName: row,
        seatNumber: n,
        label: `${row}${n}`,
        status,
      });
    }
    void ri;
  });

  return {
    showtimeId: showtime.id,
    totalSeats: rowsCount * seatsPerRow,
    soldSeats: sold,
    availableSeats: rowsCount * seatsPerRow - sold,
    rows: rowLetters,
    seatsPerRow,
    seats,
  };
};

/** Các field hợp lệ cho POST/PUT /api/staff/showtimes. */
export const STAFF_SHOWTIME_FIELDS = ['movieId', 'cinemaRoomId', 'startTime', 'endTime', 'status'];
