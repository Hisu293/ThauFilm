export const bookingService = {
  /**
   * Normalize seat layout array returned by the API
   * Backend shape: { seatId, rowName, seatNumber, type, available, price }
   * UI shape: { id, row, col, type, price, isSold, label, rowName, seatNumber }
   */
  normalizeSeats: (backendSeats = []) => {
    if (!Array.isArray(backendSeats)) return [];

    return backendSeats.map((seat) => {
      const rowName = seat.rowName || 'A';
      const seatNumber = typeof seat.seatNumber === 'number' && Number.isFinite(seat.seatNumber)
        ? seat.seatNumber
        : parseInt(String(seat.seatNumber || ''), 10) || 0;
      const col = seatNumber > 0 ? seatNumber : NaN;
      const normalizedType = String(seat.type || 'STANDARD').toUpperCase();

      return {
        id: seat.seatId,
        label: `${rowName}${seatNumber}`,
        row: rowName,
        rowName,
        col,
        seatNumber,
        type: normalizedType === 'NORMAL' || normalizedType === 'STANDARD' ? 'STANDARD' : normalizedType,
        price: Number(seat.price) || 0,
        isSold: seat.status !== 'AVAILABLE',
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
      totalAmount: Number(backendBooking.totalAmount) || 0,
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
        type: seat.type === 'NORMAL' ? 'STANDARD' : seat.type,
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

    return backendDiscounts.map((discount) => ({
      id: String(discount.id ?? ''),
      code: discount.code ?? '',
      name: discount.name ?? 'Ưu đãi thành viên',
      type: String(discount.type ?? 'FIXED').toUpperCase(),
      value: Number(discount.value) || 0,
      minPurchaseAmount: Number(discount.minPurchaseAmount) || 0,
      maxDiscountAmount: Number(discount.maxDiscountAmount) || 0,
      validFrom: discount.validFrom ?? '',
      validTo: discount.validTo ?? '',
      active: Boolean(discount.active),
    }));
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
      byDate[dateStr].push({
        id: String(showtime.id ?? showtime.showtimeId ?? ''),
        movieId: String(showtime.movieId ?? ''),
        movieTitle: showtime.movieTitle ?? '',
        time: timeStr,
        room: showtime.cinemaRoomName ?? showtime.roomName ?? showtime.room ?? '',
        format: showtime.format ?? '2D',
        theaterId: String(showtime.theaterId ?? ''),
        theaterName: showtime.theaterName ?? '',
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

    return {
      id: String(showtime.id ?? showtime.showtimeId ?? ''),
      movieId: String(showtime.movieId ?? ''),
      movieTitle: showtime.movieTitle ?? showtime.movie?.title ?? '',
      cinemaRoomId: String(showtime.cinemaRoomId ?? showtime.roomId ?? ''),
      theaterId: String(showtime.theaterId ?? ''),
      theaterName: showtime.theaterName ?? '',
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
