import { useState, useCallback, useEffect } from 'react';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

/**
 * useQuickBooking
 * Manages the cascading state for the Quick Booking widget:
 *   1. Fetch now-showing movies on mount
 *   2. When a movie is selected → fetch theaters for that movie
 *   3. When a movie is selected → fetch showtimes for that movie
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

  // ── selected values ────────────────────────────────────────────────────────
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedTheaterId, setSelectedTheaterId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');

  // ── derived: available dates for the selected theater ─────────────────────
  const [availableDates, setAvailableDates] = useState([]);

  // ── derived: showtime slots for selected theater + date ───────────────────
  const [availableSlots, setAvailableSlots] = useState([]);

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
      } catch (err) {
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

  // ── 2 & 3. When movie changes → fetch theaters and showtimes in parallel ──
  useEffect(() => {
    if (!selectedMovieId) {
      setTheaters([]);
      setAllShowtimes([]);
      setSelectedTheaterId('');
      setSelectedDate('');
      setSelectedShowtimeId('');
      setAvailableDates([]);
      setAvailableSlots([]);
      return;
    }

    let cancelled = false;

    const loadDependent = async () => {
      setTheatersLoading(true);
      setShowtimesLoading(true);
      setSelectedTheaterId('');
      setSelectedDate('');
      setSelectedShowtimeId('');
      setAvailableDates([]);
      setAvailableSlots([]);

      try {
        const [theatersRes, showtimesRes] = await Promise.all([
          bookingApi.fetchTheatersByMovie(selectedMovieId),
          bookingApi.fetchShowtimesByMovie(selectedMovieId),
        ]);

        if (cancelled) return;

        const rawTheaters = Array.isArray(theatersRes) ? theatersRes : (theatersRes?.data ?? []);
        const rawShowtimes = Array.isArray(showtimesRes) ? showtimesRes : (showtimesRes?.data ?? []);

        setTheaters(bookingService.normalizeTheaters(rawTheaters));

        // flat already has _date embedded on every entry
        const { flat } = bookingService.normalizeShowtimesForWidget(rawShowtimes);
        setAllShowtimes(flat);
      } catch {
        // Silently degrade — the widget will show no options
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
  useEffect(() => {
    if (!selectedTheaterId || allShowtimes.length === 0) {
      setAvailableDates([]);
      setSelectedDate('');
      setSelectedShowtimeId('');
      setAvailableSlots([]);
      return;
    }

    const forTheater = allShowtimes.filter((s) => s.theaterId === selectedTheaterId);
    const uniqueDates = [...new Set(forTheater.map((s) => s._date))]
      .filter(Boolean)
      .sort();

    setAvailableDates(uniqueDates);
    setSelectedDate('');
    setSelectedShowtimeId('');
    setAvailableSlots([]);
  }, [selectedTheaterId, allShowtimes]);

  // ── 5. Derive time slots for selected date ─────────────────────────────────
  useEffect(() => {
    if (!selectedTheaterId || !selectedDate || allShowtimes.length === 0) {
      setAvailableSlots([]);
      setSelectedShowtimeId('');
      return;
    }

    const slots = allShowtimes.filter(
      (s) => s.theaterId === selectedTheaterId && s._date === selectedDate
    );
    setAvailableSlots(slots);
    setSelectedShowtimeId('');
  }, [selectedTheaterId, selectedDate, allShowtimes]);

  // ── public handlers ────────────────────────────────────────────────────────
  const handleMovieChange = useCallback((movieId) => {
    setSelectedMovieId(movieId);
  }, []);

  const handleTheaterChange = useCallback((theaterId) => {
    setSelectedTheaterId(theaterId);
  }, []);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
    setSelectedShowtimeId('');
    setAvailableSlots([]);
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
