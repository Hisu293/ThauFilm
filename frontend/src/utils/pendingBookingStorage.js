const STORAGE_KEY = 'tf_pending_bookings';
const PLACEHOLDER_POSTER = '/placeholder.svg';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStore = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const savePendingBooking = (booking) => {
  if (!booking?.id) return;

  const store = readStore();
  store[String(booking.id)] = {
    bookingId: String(booking.id),
    movie: booking.movie || null,
    showtime: booking.showtime || null,
    selectedSeats: booking.selectedSeats || [],
    bookingMode: booking.bookingMode || 'THEATER',
    holdExpiresAt: booking.holdExpiresAt || null,
    confirmationCode: booking.confirmationCode || '',
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
};

const isRealPoster = (poster) => {
  if (!poster || typeof poster !== 'string') return false;
  return poster !== PLACEHOLDER_POSTER && !poster.includes('placeholder');
};

export const mergeMovieContext = (...movies) => {
  return movies.filter(Boolean).reduce((best, current) => {
    if (!best) return { ...current };

    return {
      ...best,
      ...current,
      id: best.id || current.id || '',
      title: best.title || current.title || '',
      genre: best.genre || current.genre || '',
      durationMinutes: best.durationMinutes || current.durationMinutes || null,
      ageRating: best.ageRating || current.ageRating || '',
      posterUrl: isRealPoster(best.posterUrl) ? best.posterUrl : (current.posterUrl || best.posterUrl || PLACEHOLDER_POSTER),
      poster: isRealPoster(best.poster) ? best.poster : (current.poster || best.poster || PLACEHOLDER_POSTER),
    };
  }, null);
};

export const mergeShowtimeContext = (...showtimes) => {
  return showtimes.filter(Boolean).reduce((best, current) => {
    if (!best) return { ...current };

    return {
      ...best,
      ...current,
      id: best.id || current.id || '',
      theaterName: best.theaterName || current.theaterName || '',
      room: best.room || current.room || '',
      date: best.date || current.date || '',
      time: best.time || current.time || '',
      format: best.format || current.format || '2D',
      startTime: best.startTime || current.startTime || '',
    };
  }, null);
};

export const getPendingBooking = (bookingId) => {
  if (!bookingId) return null;
  const store = readStore();
  return store[String(bookingId)] || null;
};

export const removePendingBooking = (bookingId) => {
  if (!bookingId) return;
  const store = readStore();
  delete store[String(bookingId)];
  writeStore(store);
};

export const pruneExpiredPendingBookings = () => {
  const store = readStore();
  const now = Date.now();
  let changed = false;

  Object.entries(store).forEach(([bookingId, booking]) => {
    const expiresAt = booking?.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : 0;
    if (!expiresAt || expiresAt <= now) {
      delete store[bookingId];
      changed = true;
    }
  });

  if (changed) writeStore(store);
  return store;
};
