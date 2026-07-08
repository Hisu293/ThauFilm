import { normalizeSeatType } from '../constants/enums';
import { getPaidBookingSummary } from '../utils/paidBookingStorage';

export const bookingService = {
  /**
   * Normalize seat layout array returned by the API
   * Backend shape: { seatId, rowName, seatNumber, type, status, available, price }
   * UI shape: { id, row, col, type, price, isSold, bookingStatus, label, rowName, seatNumber }
   */
  normalizeSeats: (backendSeats = []) => {
    if (!Array.isArray(backendSeats)) return [];

    return backendSeats
      .map((seat) => {
        // 1. seatId là khóa độc nhất — KHÔNG được bịa/ghi đè. Bỏ ghế không có id.
        const id = seat.seatId ?? seat.id ?? null;

        // 2. rowName: chỉ fallback khi thực sự thiếu (null/undefined/''), không nuốt 'B','C'...
        const rawRow = seat.rowName;
        const rowName = rawRow === null || rawRow === undefined || rawRow === '' ? 'A' : String(rawRow);

        // 3. seatNumber: parse số, GIỮ NGUYÊN số 0 hợp lệ (lỗi cũ: `|| 1` biến 0 thành 1)
        const parsed = Number(seat.seatNumber);
        const col = Number.isFinite(parsed) ? parsed : 1;

        const bookingStatus = String(seat.status || (seat.available ? 'AVAILABLE' : 'SOLD')).toUpperCase();
        const isSold = seat.available === false || ['HOLDING', 'BOOKED', 'SOLD'].includes(bookingStatus);

        return {
          id,
          label: `${rowName}${col}`,
          row: rowName,
          rowName,
          col,
          seatNumber: col,
          type: normalizeSeatType(seat.type),
          price: Number(seat.price) || 0,
          bookingStatus,
          isSold,
        };
      })
      .filter((seat) => seat.id != null);
  },

  /**
   * Gom danh sách ghế phẳng thành cấu trúc 2 chiều theo hàng, đã sort sẵn,
   * để render lồng .map() trực quan:
   *   groupSeatsByRow(seats).map(({ rowName, seats }) => (
   *     <Row>{seats.map(seat => <Seat key={seat.id} .../>)}</Row>
   *   ))
   * Trả về: [{ rowName: 'A', seats: [ {…col 1}, {…col 2} ] }, { rowName: 'B', ... }]
   */
  groupSeatsByRow: (normalizedSeats = []) => {
    if (!Array.isArray(normalizedSeats)) return [];

    const byRow = new Map();
    normalizedSeats.forEach((seat) => {
      if (!byRow.has(seat.rowName)) byRow.set(seat.rowName, []);
      byRow.get(seat.rowName).push(seat);
    });

    return [...byRow.entries()]
      .sort(([a], [b]) => a.localeCompare(b)) // A, B, C... theo thứ tự
      .map(([rowName, seats]) => ({
        rowName,
        seats: seats.slice().sort((s1, s2) => s1.col - s2.col), // 1, 2, 3... trong hàng
      }));
  },

  /**
   * Normalize single booking details
   * Backend shape: { id, userId, showtimeId, movieTitle, cinemaRoomName, startTime, totalAmount, status, confirmationCode, seats: [...] }
   */
  normalizeBooking: (backendBooking = {}) => {
    if (!backendBooking) return null;

    const savedPayment = getPaidBookingSummary(backendBooking.id);
    const originalAmount = Number(savedPayment?.originalAmount ?? backendBooking.totalAmount) || 0;
    const rawPaymentAmount = backendBooking.paymentAmount ?? savedPayment?.finalAmount;
    const hasPaymentAmount = rawPaymentAmount !== null && rawPaymentAmount !== undefined && rawPaymentAmount !== '';
    const paymentAmount = hasPaymentAmount ? Number(rawPaymentAmount) : null;
    const paidAmount = Number.isFinite(paymentAmount) ? paymentAmount : originalAmount;

    return {
      id: backendBooking.id,
      userId: backendBooking.userId,
      showtimeId: backendBooking.showtimeId,
      movieId: backendBooking.movieId ?? null,
      movieTitle: backendBooking.movieTitle || 'Vé xem phim',
      roomName: backendBooking.cinemaRoomName || 'Phòng chiếu',
      startTime: backendBooking.startTime,
      originalAmount,
      discountAmount: Number(savedPayment?.discountAmount) || Math.max(originalAmount - paidAmount, 0),
      paymentAmount: Number.isFinite(paymentAmount) ? paymentAmount : null,
      totalAmount: paidAmount,
      paymentMethod: backendBooking.paymentMethod || savedPayment?.paymentMethod || null,
      paymentStatus: backendBooking.paymentStatus || null,
      status: backendBooking.status,
      confirmationCode: backendBooking.confirmationCode || '—',
      holdExpiresAt: backendBooking.holdExpiresAt || null,
      confirmedAt: backendBooking.confirmedAt || null,
      seats: (backendBooking.seats || []).map((seat) => ({
        id: seat.seatId,
        label: `${seat.rowName}${seat.seatNumber}`,
        row: seat.rowName,
        rowName: seat.rowName,
        col: seat.seatNumber,
        seatNumber: seat.seatNumber,
        type: normalizeSeatType(seat.type),
        price: Number(seat.price) || 0,
      })),
    };
  },

  normalizeHistory: (backendList = []) => {
    if (!Array.isArray(backendList)) return [];
    return backendList.map(bookingService.normalizeBooking).filter(Boolean);
  },

  normalizeDiscounts: (backendDiscounts = []) => {
    if (!Array.isArray(backendDiscounts)) return [];

    return backendDiscounts.map((discount) => {
      const rawType = String(discount.type ?? 'FIXED').toUpperCase();
      return ({
      id: String(discount.id ?? ''),
      code: discount.code ?? '',
      name: discount.name ?? 'Ưu đãi thành viên',
      type: rawType === 'PERCENT' ? 'PERCENTAGE' : rawType,
      value: Number(discount.value) || 0,
      minPurchaseAmount: Number(discount.minPurchaseAmount) || 0,
      maxDiscountAmount: Number(discount.maxDiscountAmount) || 0,
      usageLimit: Number(discount.usageLimit) || 0,
      usageCount: Number(discount.usageCount) || 0,
      applicableSeatTypes: discount.applicableSeatTypes ?? '',
      validFrom: discount.validFrom ?? '',
      validTo: discount.validTo ?? '',
      active: Boolean(discount.active),
      });
    });
  },

  normalizeCombos: (backendCombos = []) => {
    if (!Array.isArray(backendCombos)) return [];

    return backendCombos.map((combo) => ({
      id: String(combo.id ?? ''),
      code: combo.code ?? '',
      name: combo.name ?? 'Combo bắp nước',
      description: combo.description ?? combo.name ?? '',
      price: Number(combo.price ?? combo.value) || 0,
      validFrom: combo.validFrom ?? '',
      validTo: combo.validTo ?? '',
      active: combo.active !== false,
    }));
  },

  normalizeMovies: (backendMovies = []) => {
    if (!Array.isArray(backendMovies)) return [];
    return backendMovies.map((movie) => ({
      id: String(movie.id ?? movie.movieId ?? ''),
      title: movie.title ?? movie.movieTitle ?? 'Phim không tên',
      posterUrl: movie.posterUrl ?? movie.poster ?? '',
    }));
  },

  normalizeTheaters: (backendTheaters = []) => {
    if (!Array.isArray(backendTheaters)) return [];
    return backendTheaters.map((theater) => ({
      id: String(theater.id ?? theater.theaterId ?? ''),
      name: theater.name ?? theater.theaterName ?? 'Rạp không tên',
      address: theater.address ?? '',
    }));
  },

  normalizeShowtimesForWidget: (backendShowtimes = []) => {
    if (!Array.isArray(backendShowtimes)) return { dates: [], showtimesByDate: {}, flat: [] };

    const byDate = {};

    backendShowtimes.forEach((showtime) => {
      const raw = showtime.startTime ?? showtime.showtime ?? showtime.startDate ?? '';
      if (!raw) return;

      const dateStr = raw.slice(0, 10);
      const timeStr = raw.length > 10 ? raw.slice(11, 16) : showtime.time ?? '';

      if (!byDate[dateStr]) byDate[dateStr] = [];
      const theaterName =
        showtime.theaterName ??
        showtime.cinemaName ??
        showtime.theater?.name ??
        showtime.cinema?.name ??
        'ThauFilm Cinema';

      byDate[dateStr].push({
        id: String(showtime.id ?? showtime.showtimeId ?? ''),
        movieId: String(showtime.movieId ?? ''),
        movieTitle: showtime.movieTitle ?? '',
        time: timeStr,
        room: showtime.cinemaRoomName ?? showtime.roomName ?? showtime.room ?? '',
        format: showtime.format ?? '2D',
        theaterId: String(showtime.theaterId ?? ''),
        theaterName,
        startTime: raw,
        endTime: showtime.endTime ?? '',
        date: dateStr,
        _date: dateStr,
      });
    });

    const dates = Object.keys(byDate).sort();
    const flat = Object.values(byDate).flat();
    return { dates, showtimesByDate: byDate, flat };
  },

  normalizeShowtime: (showtime = {}) => {
    const rawStart = showtime.startTime ?? showtime.showtime ?? showtime.startDate ?? '';
    const rawEnd = showtime.endTime ?? '';
    const date = rawStart ? String(rawStart).slice(0, 10) : '';
    const time = rawStart && String(rawStart).length > 10 ? String(rawStart).slice(11, 16) : showtime.time ?? '';

    const theaterName =
      showtime.theaterName ??
      showtime.cinemaName ??
      showtime.theater?.name ??
      showtime.cinema?.name ??
      'ThauFilm Cinema';

    return {
      id: String(showtime.id ?? showtime.showtimeId ?? ''),
      movieId: String(showtime.movieId ?? ''),
      movieTitle: showtime.movieTitle ?? showtime.movie?.title ?? '',
      cinemaRoomId: String(showtime.cinemaRoomId ?? showtime.roomId ?? ''),
      theaterId: String(showtime.theaterId ?? ''),
      theaterName,
      date,
      time,
      startTime: rawStart,
      endTime: rawEnd,
      room: showtime.cinemaRoomName ?? showtime.roomName ?? showtime.room ?? '',
      format: showtime.format ?? '2D',
      status: showtime.status,
    };
  },

  normalizeShowtimes: (backendShowtimes = []) => {
    if (!Array.isArray(backendShowtimes)) return [];
    return backendShowtimes.map(bookingService.normalizeShowtime).filter((showtime) => showtime.id);
  },
};

export default bookingService;
