import { useState, useCallback, useEffect, useMemo } from 'react';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

/**
 * useQuickBooking
 * Manages the cascading state for the Quick Booking widget:
 *   1. Fetch now-showing movies on mount
 *   2. When a movie is selected → fetch its showtimes
 *   3. Keep theater showtimes only and derive theaters from those showtimes
 *   4. Derive available dates from fetched showtimes
 *   5. When a theater + date are selected → filter showtimes accordingly
 */
export const useQuickBooking = () => {
  // ── movies ─────────────────────────────────────────────────────────────────
  const [movies, setMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState(null);

  // ── theaters ───────────────────────────────────────────────────────────────
  const [theaters, setTheaters] = useState([]);
  const [theatersLoading, setTheatersLoading] = useState(false);

  // ── showtimes (raw, grouped) ───────────────────────────────────────────────
  const [allShowtimes, setAllShowtimes] = useState([]); // normalized flat list
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [showtimesError, setShowtimesError] = useState('');

  // ── selected values ────────────────────────────────────────────────────────
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedTheaterId, setSelectedTheaterId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');

  // ── 1. Fetch now-showing movies on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMoviesLoading(true);
      setMoviesError(null);
      try {
        const res = await bookingApi.fetchNowShowingMovies();
        if (cancelled) return;
        const raw = Array.isArray(res) ? res : (res?.data ?? []);
        setMovies(bookingService.normalizeMovies(raw));
      } catch {
        if (!cancelled) {
          setMoviesError('Không thể tải danh sách phim đang chiếu.');
        }
      } finally {
        if (!cancelled) setMoviesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── 2 & 3. Load theater showtimes only; online booking has a separate flow ──
  useEffect(() => {
    if (!selectedMovieId) {
      return;
    }

    let cancelled = false;

    const loadDependent = async () => {
      setTheatersLoading(true);
      setShowtimesLoading(true);
      setShowtimesError('');
      setTheaters([]);
      setAllShowtimes([]);

      try {
        const showtimesRes = await bookingApi.fetchShowtimesByMovie(selectedMovieId);

        if (cancelled) return;

        const rawShowtimes = Array.isArray(showtimesRes) ? showtimesRes : (showtimesRes?.data ?? []);
        const theaterShowtimes = rawShowtimes.filter((showtime) => {
          const online = showtime.online === true || String(showtime.online).toLowerCase() === 'true';
          const status = String(showtime.status || '').toUpperCase();
          const roomId = showtime.cinemaRoomId ?? showtime.roomId;
          return !online && Boolean(showtime.theaterId) && Boolean(roomId)
            && !['CANCELLED', 'COMPLETED'].includes(status);
        });
        const { flat } = bookingService.normalizeShowtimesForWidget(theaterShowtimes);
        const now = Date.now();
        const upcoming = flat.filter((showtime) => {
          const startMs = new Date(showtime.startTime).getTime();
          return showtime.theaterId && !Number.isNaN(startMs) && startMs > now;
        });
        const theatersById = new Map();
        upcoming.forEach((showtime) => {
          if (!theatersById.has(showtime.theaterId)) {
            theatersById.set(showtime.theaterId, {
              id: showtime.theaterId,
              name: showtime.theaterName || 'Rạp ThauFilm',
              address: '',
            });
          }
        });
        setTheaters([...theatersById.values()]);
        setAllShowtimes(upcoming);
      } catch {
        if (!cancelled) {
          setTheaters([]);
          setAllShowtimes([]);
          setShowtimesError('Không thể tải lịch chiếu tại rạp. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) {
          setTheatersLoading(false);
          setShowtimesLoading(false);
        }
      }
    };

    loadDependent();
    return () => { cancelled = true; };
  }, [selectedMovieId]);

  // ── 4. Derive available dates whenever theater or allShowtimes changes ─────
  const availableDates = useMemo(() => {
    if (!selectedTheaterId) return [];
    const forTheater = allShowtimes.filter((s) => s.theaterId === selectedTheaterId);
    return [...new Set(forTheater.map((s) => s._date))]
      .filter(Boolean)
      .sort();
  }, [selectedTheaterId, allShowtimes]);

  // ── 5. Derive time slots for selected date ─────────────────────────────────
  const availableSlots = useMemo(() => {
    if (!selectedTheaterId || !selectedDate) return [];
    return allShowtimes.filter(
      (s) => s.theaterId === selectedTheaterId && s._date === selectedDate
    );
  }, [selectedTheaterId, selectedDate, allShowtimes]);

  // ── public handlers ────────────────────────────────────────────────────────
  const handleMovieChange = useCallback((movieId) => {
    setSelectedMovieId(movieId);
    setTheaters([]);
    setAllShowtimes([]);
    setSelectedTheaterId('');
    setSelectedDate('');
    setSelectedShowtimeId('');
    setShowtimesError('');
  }, []);

  const handleTheaterChange = useCallback((theaterId) => {
    setSelectedTheaterId(theaterId);
    setSelectedDate('');
    setSelectedShowtimeId('');
  }, []);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
    setSelectedShowtimeId('');
  }, []);

  const handleShowtimeChange = useCallback((showtimeId) => {
    setSelectedShowtimeId(showtimeId);
  }, []);

  const isReady =
    !!selectedMovieId &&
    !!selectedTheaterId &&
    !!selectedDate &&
    !!selectedShowtimeId;

  return {
    // data
    movies,
    theaters,
    availableDates,
    availableSlots,
    // loading states
    moviesLoading,
    theatersLoading,
    showtimesLoading,
    showtimesError,
    moviesError,
    // selected values
    selectedMovieId,
    selectedTheaterId,
    selectedDate,
    selectedShowtimeId,
    // handlers
    handleMovieChange,
    handleTheaterChange,
    handleDateChange,
    handleShowtimeChange,
    // readiness
    isReady,
  };
};

export default useQuickBooking;
