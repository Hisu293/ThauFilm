import { http, HttpResponse } from 'msw';
import { staffMoviesDb, STAFF_MOVIE_FIELDS } from './staffMoviesData';
import {
  staffShowtimesDb,
  buildShowtime,
  buildSeatMap,
  STAFF_SHOWTIME_FIELDS,
} from './staffShowtimesData';
import { staffTicketsDb, toTicketDto } from './staffTicketsData';
import { staffBookingsDb, buildPurchasedMovies, toBookingDto } from './staffBookingsData';
import {
  staffCustomersDb,
  buildCustomerBookings,
  buildOnlineMovies,
  customerComplaints,
} from './staffCustomersData';
import {
  staffPromotionsDb,
  STAFF_PROMOTION_FIELDS,
  toPromotionDto,
  buildUsage,
} from './staffPromotionsData';
import {
  buildRevenue,
  buildTicketSales,
  buildOnlineMovieSales,
  buildTopMovies,
  buildTopShowtimes,
} from './staffReportsData';

// Bộ đếm sinh id cho khuyến mãi mới.
let promotionSeq = 1000;
const nextPromotionId = () => {
  promotionSeq += 1;
  return `pr900000-0000-0000-0000-${String(promotionSeq).padStart(12, '0')}`;
};

// Bộ đếm sinh id cho suất chiếu mới (tránh Date.now/Math.random).
let showtimeSeq = 1000;
const nextShowtimeId = () => {
  showtimeSeq += 1;
  return `s9000000-0000-0000-0000-${String(showtimeSeq).padStart(12, '0')}`;
};

/** Bọc dữ liệu theo body chuẩn của backend: { success, message, data }. */
const ok = (data, message = 'Thành công') =>
  HttpResponse.json({ success: true, message, data });

const fail = (message, status = 404) =>
  HttpResponse.json({ success: false, message, data: null }, { status });

/**
 * Dùng `*` ở đầu path để khớp bất kể host (axios gọi http://localhost:8080/...).
 * Mọi handler trả về đúng envelope { success, message, data }.
 */
export const handlers = [
  // GET /api/staff/movies — danh sách phim
  http.get('*/api/staff/movies', () => {
    return ok(staffMoviesDb, 'Lấy danh sách phim thành công');
  }),

  // GET /api/staff/movies/{movieId} — chi tiết 1 phim
  http.get('*/api/staff/movies/:movieId', ({ params }) => {
    const movie = staffMoviesDb.find((m) => m.id === params.movieId);
    if (!movie) return fail('Không tìm thấy phim');
    return ok(movie, 'Lấy chi tiết phim thành công');
  }),

  // PUT /api/staff/movies/{movieId} — cập nhật phim (poster, trailer, mô tả, lịch phát hành...)
  http.put('*/api/staff/movies/:movieId', async ({ params, request }) => {
    const index = staffMoviesDb.findIndex((m) => m.id === params.movieId);
    if (index === -1) return fail('Không tìm thấy phim');

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Chỉ nhận các field hợp lệ, ghi đè trực tiếp vào "DB" trong bộ nhớ.
    const current = staffMoviesDb[index];
    const next = { ...current };
    for (const key of STAFF_MOVIE_FIELDS) {
      if (body[key] !== undefined) next[key] = body[key];
    }
    if (next.durationMinutes !== undefined) next.durationMinutes = Number(next.durationMinutes);
    if (next.rating !== undefined) next.rating = Number(next.rating);
    if (next.active !== undefined) next.active = Boolean(next.active);

    staffMoviesDb[index] = next;
    return ok(next, 'Cập nhật phim thành công');
  }),

  // ─── Quản lý suất chiếu (Staff) ─────────────────────────────────────────────

  // GET /api/staff/showtimes — danh sách suất chiếu
  http.get('*/api/staff/showtimes', () => {
    return ok(staffShowtimesDb, 'Lấy danh sách suất chiếu thành công');
  }),

  // GET /api/staff/showtimes/{showtimeId}/seats — sơ đồ ghế + tình trạng
  http.get('*/api/staff/showtimes/:showtimeId/seats', ({ params }) => {
    const showtime = staffShowtimesDb.find((s) => s.id === params.showtimeId);
    if (!showtime) return fail('Không tìm thấy suất chiếu');
    return ok(buildSeatMap(showtime), 'Lấy sơ đồ ghế thành công');
  }),

  // POST /api/staff/showtimes — tạo suất chiếu
  http.post('*/api/staff/showtimes', async ({ request }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    if (!body.movieId || !body.cinemaRoomId || !body.startTime || !body.endTime) {
      return fail('Thiếu thông tin: cần phim, phòng chiếu, giờ bắt đầu và giờ kết thúc.', 400);
    }
    const created = buildShowtime({
      id: nextShowtimeId(),
      movieId: body.movieId,
      cinemaRoomId: body.cinemaRoomId,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status || 'SCHEDULED',
    });
    staffShowtimesDb.push(created);
    return HttpResponse.json(
      { success: true, message: 'Tạo suất chiếu thành công', data: created },
      { status: 201 },
    );
  }),

  // PUT /api/staff/showtimes/{showtimeId} — cập nhật giờ chiếu / phòng / trạng thái
  http.put('*/api/staff/showtimes/:showtimeId', async ({ params, request }) => {
    const index = staffShowtimesDb.findIndex((s) => s.id === params.showtimeId);
    if (index === -1) return fail('Không tìm thấy suất chiếu');

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const current = staffShowtimesDb[index];
    const merged = { ...current };
    for (const key of STAFF_SHOWTIME_FIELDS) {
      if (body[key] !== undefined) merged[key] = body[key];
    }
    // Tính lại tên phim/phòng/rạp theo id mới (nếu có đổi).
    const next = buildShowtime({
      id: current.id,
      movieId: merged.movieId,
      cinemaRoomId: merged.cinemaRoomId,
      startTime: merged.startTime,
      endTime: merged.endTime,
      status: merged.status,
    });

    staffShowtimesDb[index] = next;
    return ok(next, 'Cập nhật suất chiếu thành công');
  }),

  // DELETE /api/staff/showtimes/{showtimeId} — hủy/xóa suất chiếu
  http.delete('*/api/staff/showtimes/:showtimeId', ({ params }) => {
    const index = staffShowtimesDb.findIndex((s) => s.id === params.showtimeId);
    if (index === -1) return fail('Không tìm thấy suất chiếu');
    staffShowtimesDb.splice(index, 1);
    return ok({}, 'Xóa suất chiếu thành công');
  }),

  // ─── Quản lý vé (Staff) ─────────────────────────────────────────────────────

  // POST /api/staff/tickets/check-in — check-in vé bằng mã/QR (đặt trước :ticketId)
  http.post('*/api/staff/tickets/check-in', async ({ request }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    // Cho phép check-in theo ticketCode (QR) hoặc ticketId/id.
    const key = body.ticketCode || body.ticketId || body.id || body.code;
    const ticket = staffTicketsDb.find(
      (t) => t.ticketCode === key || t.id === key,
    );
    if (!ticket) return fail('Không tìm thấy vé với mã đã quét.', 404);
    if (ticket.status === 'CANCELLED') return fail('Vé đã bị hủy, không thể check-in.', 400);
    if (ticket.checkedIn) return fail('Vé này đã được check-in trước đó.', 409);

    ticket.checkedIn = true;
    ticket.status = 'CHECKED_IN';
    return ok(toTicketDto(ticket), 'Check-in vé thành công');
  }),

  // GET /api/staff/tickets — danh sách vé đã đặt
  http.get('*/api/staff/tickets', () => {
    return ok(staffTicketsDb.map(toTicketDto), 'Lấy danh sách vé thành công');
  }),

  // GET /api/staff/tickets/{ticketId}/reprint — in lại vé
  http.get('*/api/staff/tickets/:ticketId/reprint', ({ params }) => {
    const ticket = staffTicketsDb.find(
      (t) => t.id === params.ticketId || t.ticketCode === params.ticketId,
    );
    if (!ticket) return fail('Không tìm thấy vé');
    if (ticket.status === 'CANCELLED') return fail('Vé đã hủy, không thể in lại.', 400);
    // Trả dữ liệu đủ để render lại vé/QR.
    return ok(
      {
        ticketCode: ticket.ticketCode,
        bookingId: ticket.bookingId,
        customerName: ticket.customerName,
        movieTitle: ticket.movieTitle,
        theaterName: ticket.theaterName,
        roomName: ticket.roomName,
        seatLabel: ticket.seatLabel,
        showtime: ticket.showtime,
        qrContent: `THAUFILM|${ticket.bookingId}|${ticket.ticketCode}|${ticket.seatLabel}`,
      },
      'Sẵn sàng in lại vé',
    );
  }),

  // GET /api/staff/tickets/{ticketId}/payment — kiểm tra thanh toán
  http.get('*/api/staff/tickets/:ticketId/payment', ({ params }) => {
    const ticket = staffTicketsDb.find(
      (t) => t.id === params.ticketId || t.ticketCode === params.ticketId,
    );
    if (!ticket) return fail('Không tìm thấy vé');
    return ok(
      {
        ticketCode: ticket.ticketCode,
        bookingId: ticket.bookingId,
        ...ticket.payment,
      },
      'Lấy thông tin thanh toán thành công',
    );
  }),

  // GET /api/staff/tickets/{ticketId} — chi tiết vé (kèm thông tin khách)
  http.get('*/api/staff/tickets/:ticketId', ({ params }) => {
    const ticket = staffTicketsDb.find(
      (t) => t.id === params.ticketId || t.ticketCode === params.ticketId,
    );
    if (!ticket) return fail('Không tìm thấy vé');
    // Trả đủ field (gồm thông tin khách & thanh toán) cho màn chi tiết.
    return ok({ ...ticket }, 'Lấy chi tiết vé thành công');
  }),

  // PUT /api/staff/tickets/{ticketId}/cancel — hủy vé theo chính sách
  http.put('*/api/staff/tickets/:ticketId/cancel', ({ params }) => {
    const ticket = staffTicketsDb.find(
      (t) => t.id === params.ticketId || t.ticketCode === params.ticketId,
    );
    if (!ticket) return fail('Không tìm thấy vé');
    if (ticket.checkedIn) return fail('Vé đã check-in, không thể hủy.', 400);
    if (ticket.status === 'CANCELLED') return fail('Vé đã được hủy trước đó.', 409);

    ticket.status = 'CANCELLED';
    if (ticket.payment) ticket.payment.status = 'REFUNDED';
    return ok(toTicketDto(ticket), 'Hủy vé thành công');
  }),

  // ─── Quản lý đơn hàng phim online (Staff) ───────────────────────────────────

  // GET /api/staff/bookings/users/{userId}/purchased-movies — kiểm tra phim đã mua / quyền xem
  http.get('*/api/staff/bookings/users/:userId/purchased-movies', ({ params }) => {
    return ok(buildPurchasedMovies(params.userId), 'Lấy danh sách phim đã mua thành công');
  }),

  // GET /api/staff/bookings/{bookingId}/payment — kiểm tra thanh toán / lịch sử giao dịch
  http.get('*/api/staff/bookings/:bookingId/payment', ({ params }) => {
    const booking = staffBookingsDb.find((b) => b.id === params.bookingId);
    if (!booking) return fail('Không tìm thấy đơn hàng');
    return ok(
      { bookingId: booking.id, confirmationCode: booking.confirmationCode, ...booking.payment },
      'Lấy thông tin thanh toán thành công',
    );
  }),

  // POST /api/staff/bookings/{bookingId}/regrant-access — cấp lại quyền xem
  http.post('*/api/staff/bookings/:bookingId/regrant-access', ({ params }) => {
    const booking = staffBookingsDb.find((b) => b.id === params.bookingId);
    if (!booking) return fail('Không tìm thấy đơn hàng');
    if (booking.status === 'CANCELLED') return fail('Đơn đã hủy, không thể cấp quyền.', 400);
    booking.accessGranted = true;
    return ok(
      { bookingId: booking.id, accessGranted: true, grantedAt: booking.confirmedAt || booking.startTime },
      'Cấp lại quyền xem thành công',
    );
  }),

  // POST /api/staff/bookings/{bookingId}/refund — hỗ trợ hoàn tiền
  http.post('*/api/staff/bookings/:bookingId/refund', ({ params }) => {
    const booking = staffBookingsDb.find((b) => b.id === params.bookingId);
    if (!booking) return fail('Không tìm thấy đơn hàng');
    if (booking.payment?.status === 'REFUNDED') return fail('Đơn đã được hoàn tiền trước đó.', 409);
    if (booking.payment?.status !== 'PAID') return fail('Đơn chưa thanh toán, không thể hoàn tiền.', 400);
    booking.payment.status = 'REFUNDED';
    booking.payment.history.push({ at: booking.startTime, action: 'Hoàn tiền cho khách', amount: booking.payment.amount });
    booking.status = 'REFUNDED';
    return ok(
      { bookingId: booking.id, refunded: true, amount: booking.payment.amount, status: 'REFUNDED' },
      'Hoàn tiền thành công',
    );
  }),

  // POST /api/staff/bookings/{bookingId}/cancel — hủy đơn
  http.post('*/api/staff/bookings/:bookingId/cancel', ({ params }) => {
    const booking = staffBookingsDb.find((b) => b.id === params.bookingId);
    if (!booking) return fail('Không tìm thấy đơn hàng');
    if (booking.status === 'CANCELLED') return fail('Đơn đã được hủy trước đó.', 409);
    booking.status = 'CANCELLED';
    booking.accessGranted = false;
    booking.seats = booking.seats.map((s) => ({ ...s, status: 'AVAILABLE' }));
    return ok(toBookingDto(booking), 'Hủy đơn thành công');
  }),

  // GET /api/staff/bookings/{bookingId} — chi tiết 1 đơn
  http.get('*/api/staff/bookings/:bookingId', ({ params }) => {
    const booking = staffBookingsDb.find((b) => b.id === params.bookingId);
    if (!booking) return fail('Không tìm thấy đơn hàng');
    return ok({ ...booking }, 'Lấy chi tiết đơn hàng thành công');
  }),

  // GET /api/staff/bookings — danh sách đơn mua phim
  http.get('*/api/staff/bookings', () => {
    return ok(staffBookingsDb.map(toBookingDto), 'Lấy danh sách đơn hàng thành công');
  }),

  // ─── Quản lý khách hàng (Staff) ─────────────────────────────────────────────

  // GET /api/staff/customers/{id}/online-movies — lịch sử mua phim online
  http.get('*/api/staff/customers/:customerId/online-movies', ({ params }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    return ok(buildOnlineMovies(params.customerId), 'Lấy lịch sử phim online thành công');
  }),

  // GET /api/staff/customers/{id}/bookings — lịch sử mua vé tại rạp
  http.get('*/api/staff/customers/:customerId/bookings', ({ params }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    return ok(buildCustomerBookings(params.customerId), 'Lấy lịch sử đặt vé thành công');
  }),

  // POST /api/staff/customers/{id}/complaints — ghi nhận khiếu nại (body là chuỗi)
  http.post('*/api/staff/customers/:customerId/complaints', async ({ params, request }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    let content;
    try {
      content = await request.text();
    } catch {
      content = '';
    }
    // Body có thể là chuỗi thuần hoặc chuỗi JSON đã bọc dấu nháy.
    const text = content.replace(/^"|"$/g, '').trim();
    if (!text) return fail('Nội dung khiếu nại trống.', 400);
    const list = customerComplaints[params.customerId] || (customerComplaints[params.customerId] = []);
    const entry = { id: `cmp-${list.length + 1}`, content: text, createdAt: customer.id };
    list.push(entry);
    return HttpResponse.json(
      { success: true, message: 'Đã ghi nhận khiếu nại', data: entry },
      { status: 201 },
    );
  }),

  // PUT /api/staff/customers/{id}/lock — khóa tài khoản
  http.put('*/api/staff/customers/:customerId/lock', ({ params }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    customer.enabled = false;
    return ok({ ...customer }, 'Đã khóa tài khoản');
  }),

  // PUT /api/staff/customers/{id}/unlock — mở khóa tài khoản
  http.put('*/api/staff/customers/:customerId/unlock', ({ params }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    customer.enabled = true;
    return ok({ ...customer }, 'Đã mở khóa tài khoản');
  }),

  // GET /api/staff/customers/{id} — chi tiết khách hàng
  http.get('*/api/staff/customers/:customerId', ({ params }) => {
    const customer = staffCustomersDb.find((c) => c.id === params.customerId);
    if (!customer) return fail('Không tìm thấy khách hàng');
    return ok({ ...customer }, 'Lấy thông tin khách hàng thành công');
  }),

  // GET /api/staff/customers — danh sách khách hàng
  http.get('*/api/staff/customers', () => {
    return ok(staffCustomersDb.map((c) => ({ ...c })), 'Lấy danh sách khách hàng thành công');
  }),

  // ─── Quản lý khuyến mãi (Staff) ─────────────────────────────────────────────

  // GET /api/staff/promotions/{id}/usage — theo dõi số lần sử dụng
  http.get('*/api/staff/promotions/:promotionId/usage', ({ params }) => {
    const promo = staffPromotionsDb.find((p) => p.id === params.promotionId);
    if (!promo) return fail('Không tìm thấy mã giảm giá');
    return ok(buildUsage(promo), 'Lấy thống kê sử dụng thành công');
  }),

  // PUT /api/staff/promotions/{id}/enable — kích hoạt
  http.put('*/api/staff/promotions/:promotionId/enable', ({ params }) => {
    const promo = staffPromotionsDb.find((p) => p.id === params.promotionId);
    if (!promo) return fail('Không tìm thấy mã giảm giá');
    promo.active = true;
    return ok(toPromotionDto(promo), 'Đã kích hoạt mã giảm giá');
  }),

  // PUT /api/staff/promotions/{id}/disable — vô hiệu hóa
  http.put('*/api/staff/promotions/:promotionId/disable', ({ params }) => {
    const promo = staffPromotionsDb.find((p) => p.id === params.promotionId);
    if (!promo) return fail('Không tìm thấy mã giảm giá');
    promo.active = false;
    return ok(toPromotionDto(promo), 'Đã vô hiệu hóa mã giảm giá');
  }),

  // POST /api/staff/promotions — tạo mã giảm giá (body là object trực tiếp, không bọc envelope)
  http.post('*/api/staff/promotions', async ({ request }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    if (!body.code || !body.name || !body.type) {
      return fail('Thiếu thông tin: cần mã, tên và loại khuyến mãi.', 400);
    }
    if (staffPromotionsDb.some((p) => p.code?.toUpperCase() === String(body.code).toUpperCase())) {
      return fail('Mã giảm giá đã tồn tại.', 409);
    }
    const promo = { id: nextPromotionId(), usedCount: 0 };
    for (const key of STAFF_PROMOTION_FIELDS) {
      if (body[key] !== undefined) promo[key] = body[key];
    }
    promo.value = Number(promo.value) || 0;
    promo.minPurchaseAmount = Number(promo.minPurchaseAmount) || 0;
    promo.maxDiscountAmount = Number(promo.maxDiscountAmount) || 0;
    promo.usageLimit = promo.usageLimit != null ? Number(promo.usageLimit) : null;
    promo.active = promo.active !== undefined ? Boolean(promo.active) : true;
    staffPromotionsDb.push(promo);
    return HttpResponse.json(
      { success: true, message: 'Tạo mã giảm giá thành công', data: toPromotionDto(promo) },
      { status: 201 },
    );
  }),

  // PUT /api/staff/promotions/{id} — cập nhật mã giảm giá
  http.put('*/api/staff/promotions/:promotionId', async ({ params, request }) => {
    const index = staffPromotionsDb.findIndex((p) => p.id === params.promotionId);
    if (index === -1) return fail('Không tìm thấy mã giảm giá');
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const next = { ...staffPromotionsDb[index] };
    for (const key of STAFF_PROMOTION_FIELDS) {
      if (body[key] !== undefined) next[key] = body[key];
    }
    next.value = Number(next.value) || 0;
    next.minPurchaseAmount = Number(next.minPurchaseAmount) || 0;
    next.maxDiscountAmount = Number(next.maxDiscountAmount) || 0;
    next.usageLimit = next.usageLimit != null ? Number(next.usageLimit) : null;
    next.active = Boolean(next.active);
    staffPromotionsDb[index] = next;
    return ok(toPromotionDto(next), 'Cập nhật mã giảm giá thành công');
  }),

  // GET /api/staff/promotions/{id} — chi tiết mã giảm giá
  http.get('*/api/staff/promotions/:promotionId', ({ params }) => {
    const promo = staffPromotionsDb.find((p) => p.id === params.promotionId);
    if (!promo) return fail('Không tìm thấy mã giảm giá');
    return ok(toPromotionDto(promo), 'Lấy chi tiết mã giảm giá thành công');
  }),

  // GET /api/staff/promotions — danh sách mã giảm giá
  http.get('*/api/staff/promotions', () => {
    return ok(staffPromotionsDb.map(toPromotionDto), 'Lấy danh sách mã giảm giá thành công');
  }),

  // ─── Báo cáo cơ bản (Staff) ─────────────────────────────────────────────────

  // GET /api/staff/reports/revenue — doanh thu theo ngày (rạp + online)
  http.get('*/api/staff/reports/revenue', () => ok(buildRevenue(), 'Lấy báo cáo doanh thu thành công')),

  // GET /api/staff/reports/ticket-sales — số vé bán được
  http.get('*/api/staff/reports/ticket-sales', () => ok(buildTicketSales(), 'Lấy báo cáo vé thành công')),

  // GET /api/staff/reports/online-movie-sales — số lượt xem phim online
  http.get('*/api/staff/reports/online-movie-sales', () => ok(buildOnlineMovieSales(), 'Lấy báo cáo phim online thành công')),

  // GET /api/staff/reports/top-movies — top phim bán chạy
  http.get('*/api/staff/reports/top-movies', () => ok(buildTopMovies(), 'Lấy top phim thành công')),

  // GET /api/staff/reports/top-showtimes — top suất chiếu đông khách
  http.get('*/api/staff/reports/top-showtimes', () => ok(buildTopShowtimes(), 'Lấy top suất chiếu thành công')),
];

export default handlers;
