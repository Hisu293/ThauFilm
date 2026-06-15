export const bookingService = {
  /**
   * Normalize seat layout array returned by the API
   * Backend shape: { seatId, rowName, seatNumber, type, available, price }
   * UI shape: { id, row, col, type, price, isSold, label }
   */
  normalizeSeats: (backendSeats = []) => {
    if (!Array.isArray(backendSeats)) return [];
    
    return backendSeats.map((seat) => {
      const row = seat.rowName || 'A';
      const col = parseInt(seat.seatNumber, 10) || 1;
      const typeNormalized = String(seat.type || 'STANDARD').toUpperCase();

      return {
        id: seat.seatId, // UUID for backend payloads
        label: `${row}${col}`, // Display code (e.g., A5)
        row,
        col,
        type: typeNormalized === 'NORMAL' ? 'STANDARD' : typeNormalized,
        price: Number(seat.price) || 0,
        isSold: !seat.available, // if not available, it is sold/held
      };
    });
  },

  /**
   * Normalize single booking details
   * Backend shape: { id, userId, showtimeId, movieTitle, cinemaRoomName, startTime, totalAmount, status, confirmationCode, seats: [...] }
   */
  normalizeBooking: (backendBooking = {}) => {
    if (!backendBooking) return null;
    
    return {
      id: backendBooking.id,
      userId: backendBooking.userId,
      showtimeId: backendBooking.showtimeId,
      movieTitle: backendBooking.movieTitle || 'Vé xem phim',
      roomName: backendBooking.cinemaRoomName || 'Phòng chiếu',
      startTime: backendBooking.startTime,
      totalAmount: backendBooking.totalAmount || 0,
      status: backendBooking.status,
      confirmationCode: backendBooking.confirmationCode || '—',
      seats: (backendBooking.seats || []).map((s) => ({
        id: s.seatId,
        label: `${s.rowName}${s.seatNumber}`,
        row: s.rowName,
        col: s.seatNumber,
        type: s.type === 'NORMAL' ? 'STANDARD' : s.type,
        price: s.price,
      })),
    };
  },

  /**
   * Normalize history bookings list
   */
  normalizeHistory: (backendList = []) => {
    if (!Array.isArray(backendList)) return [];
    return backendList.map(bookingService.normalizeBooking).filter(Boolean);
  },

  // ── Quick Booking helpers ──────────────────────────────────────────────────

  /**
   * Normalize now-showing movies for the Quick Booking selector.
   * Backend shape: [{ id, title, posterUrl, ... }]
   * UI shape: { id, title }
   */
  normalizeMovies: (backendMovies = []) => {
    if (!Array.isArray(backendMovies)) return [];
    return backendMovies.map((m) => ({
      id: String(m.id ?? m.movieId ?? ''),
      title: m.title ?? m.movieTitle ?? 'Phim không tên',
      posterUrl: m.posterUrl ?? m.poster ?? '',
    }));
  },

  /**
   * Normalize theaters for the Quick Booking selector.
   * Backend shape: [{ id, name, address, ... }]
   * UI shape: { id, name }
   */
  normalizeTheaters: (backendTheaters = []) => {
    if (!Array.isArray(backendTheaters)) return [];
    return backendTheaters.map((t) => ({
      id: String(t.id ?? t.theaterId ?? ''),
      name: t.name ?? t.theaterName ?? 'Rạp không tên',
      address: t.address ?? '',
    }));
  },

  /**
   * Normalize showtimes for the Quick Booking widget.
   * Backend shape: [{ id, movieId, theaterId, roomId, roomName, startTime, format, ... }]
   * Returns:
   *   - dates: string[] — ISO date strings (YYYY-MM-DD), unique & sorted
   *   - showtimesByDate: Record<dateStr, { id, time, room, format, theaterId }[]>
   */
  normalizeShowtimesForWidget: (backendShowtimes = []) => {
    if (!Array.isArray(backendShowtimes)) return { dates: [], showtimesByDate: {} };

    const byDate = {};

    backendShowtimes.forEach((s) => {
      const raw = s.startTime ?? s.showtime ?? s.startDate ?? '';
      if (!raw) return;
      const dateStr = raw.slice(0, 10); // 'YYYY-MM-DD'
      const timeStr = raw.length > 10
        ? raw.slice(11, 16)  // 'HH:mm'
        : (s.time ?? '');

      if (!byDate[dateStr]) byDate[dateStr] = [];
      const entry = {
        id: String(s.id ?? s.showtimeId ?? ''),
        time: timeStr,
        room: s.roomName ?? s.room ?? '',
        format: s.format ?? '2D',
        theaterId: String(s.theaterId ?? ''),
        _date: dateStr, // keeps date context for downstream filtering
      };
      byDate[dateStr].push(entry);
    });

    const dates = Object.keys(byDate).sort();
    const flat = Object.values(byDate).flat();
    return { dates, showtimesByDate: byDate, flat };
  },
};

export default bookingService;
