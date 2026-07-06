import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MoviePosterCard from '../components/movies/MoviePosterCard';
import { fetchMovies } from '../services/movieService';
import { bookingApi } from '../api/bookingApi';
import './MoviesPage.css';

const TABS = [
  { label: 'Tất cả', key: 'all' },
  { label: 'Đang Chiếu', key: 'now' },
  { label: 'Sắp Chiếu', key: 'soon' },
];

const PAGE_SIZE = 12;
const unwrapApiResponse = (response) => response?.data?.data ?? response?.data ?? response;
const formatMysteryDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const MoviesPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Tất cả');
  const [page, setPage] = useState(1);

  const [allMovies, setAllMovies] = useState([]);
  const [mysteryShowtimes, setMysteryShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ movies }, showtimesResponse] = await Promise.all([
        fetchMovies(),
        bookingApi.fetchShowtimes().catch(() => ({ data: [] })),
      ]);
      setAllMovies(movies);
      const showtimes = unwrapApiResponse(showtimesResponse);
      const now = Date.now();
      setMysteryShowtimes((Array.isArray(showtimes) ? showtimes : [])
        .filter((showtime) => showtime?.mystery)
        .filter((showtime) => {
          const startTime = showtime.startTime ? new Date(showtime.startTime).getTime() : 0;
          return Number.isFinite(startTime) && startTime > now;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 6));
    } catch (err) {
      setError(err.message || 'Không tải được danh sách phim.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMovies(); }, [loadMovies]);

  // Counts for tab badges
  const nowCount = useMemo(() => allMovies.filter((m) => m.isNowShowing).length, [allMovies]);
  const soonCount = useMemo(() => allMovies.filter((m) => m.isComingSoon).length, [allMovies]);

  // Active tab pool — filtered from the full list (all data present)
  const activePool = useMemo(() => {
    if (tab === 1) return allMovies.filter((m) => m.isNowShowing);
    if (tab === 2) return allMovies.filter((m) => m.isComingSoon);
    return allMovies;
  }, [tab, allMovies]);

  const genres = useMemo(
    () => ['Tất cả', ...Array.from(new Set(allMovies.map((m) => m.genre).filter(Boolean))).sort()],
    [allMovies]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activePool.filter((m) => {
      if (q && !m.title?.toLowerCase().includes(q)) return false;
      if (genre !== 'Tất cả' && m.genre !== genre) return false;
      return true;
    });
  }, [activePool, query, genre]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleTabChange = (i) => { setTab(i); setPage(1); };
  const handleQueryChange = (e) => { setQuery(e.target.value); setPage(1); };
  const handleGenreChange = (e) => { setGenre(e.target.value); setPage(1); };
  const handleMysteryBooking = (showtime) => {
    const mysteryMovie = {
      id: '',
      title: showtime.movieTitle || 'Mystery Movie Night',
      posterUrl: '/placeholder.svg',
      poster: '/placeholder.svg',
      genre: 'Sự kiện bí mật',
      duration: null,
      isMystery: true,
    };
    const mysteryShowtime = {
      id: String(showtime.id ?? showtime.showtimeId ?? ''),
      movieId: '',
      movieTitle: showtime.movieTitle || 'Mystery Movie Night',
      time: showtime.startTime ? String(showtime.startTime).slice(11, 16) : '',
      date: showtime.startTime ? String(showtime.startTime).slice(0, 10) : '',
      room: showtime.cinemaRoomName || showtime.roomName || showtime.room || '',
      format: showtime.format || '2D',
      theaterName: showtime.theaterName || 'ThauFilm Cinema',
      startTime: showtime.startTime,
      endTime: showtime.endTime,
      mystery: true,
      mysteryUnlockAt: showtime.mysteryUnlockAt,
    };
    navigate(`/booking/seats/${mysteryShowtime.id}`, {
      state: { movie: mysteryMovie, showtime: mysteryShowtime },
    });
  };

  return (
    <Box sx={{ color: '#fff', pb: 8 }}>
      {/* Hero banner */}
      <div className="movies-hero">
        <div className="movies-hero__inner">
          <Typography variant="overline" sx={{ color: '#e50914', fontWeight: 800, letterSpacing: '0.12em' }}>
            THAUFILM
          </Typography>
          <h1 className="movies-hero__title">Khám phá thế giới điện ảnh</h1>
          <p className="movies-hero__sub">Phim đang chiếu, sắp chiếu, bom tấn IMAX — đặt vé chỉ trong vài giây.</p>
        </div>
      </div>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {!loading && !error && mysteryShowtimes.length > 0 && (
          <section className="mystery-strip">
            <div className="mystery-strip__head">
              <div>
                <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: '0.12em' }}>
                  SỰ KIỆN BÍ MẬT
                </Typography>
                <h2>Mystery Movie Night</h2>
                <p>Mua vé 79.000đ, tên phim sẽ được mở khóa khi đến giờ chiếu.</p>
              </div>
            </div>
            <div className="mystery-strip__grid">
              {mysteryShowtimes.map((showtime) => (
                <article key={showtime.id} className="mystery-card">
                  <div>
                    <h3>{showtime.movieTitle || 'Mystery Movie Night'}</h3>
                    <p>{formatMysteryDate(showtime.startTime)}</p>
                    <span>{showtime.theaterName || 'ThauFilm Cinema'} · {showtime.cinemaRoomName || showtime.roomName || 'Phòng chiếu'}</span>
                  </div>
                  <button type="button" onClick={() => handleMysteryBooking(showtime)}>
                    Đặt vé
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="movies-tabs">
          <button
            type="button"
            className={`movies-tab ${tab === 0 ? 'is-active' : ''}`}
            onClick={() => handleTabChange(0)}
          >
            Tất cả
            {!loading && allMovies.length > 0 && (
              <span className="movies-tab-count">{allMovies.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`movies-tab ${tab === 1 ? 'is-active' : ''}`}
            onClick={() => handleTabChange(1)}
          >
            Đang Chiếu
            {!loading && nowCount > 0 && <span className="movies-tab-count">{nowCount}</span>}
          </button>
          <button
            type="button"
            className={`movies-tab ${tab === 2 ? 'is-active' : ''}`}
            onClick={() => handleTabChange(2)}
          >
            Sắp Chiếu
            {!loading && soonCount > 0 && <span className="movies-tab-count">{soonCount}</span>}
          </button>
        </div>

        {/* Toolbar */}
        <div className="movies-toolbar">
          <div className="movies-search">
            <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <input
              placeholder="Tìm phim theo tên…"
              value={query}
              onChange={handleQueryChange}
            />
          </div>
          <div className="movies-filters">
            <select value={genre} onChange={handleGenreChange}>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g === 'Tất cả' ? 'Thể loại' : g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#e50914' }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: '#f87171', mb: 2 }}>{error}</Typography>
            <button
              type="button"
              className="movies-tab is-active"
              onClick={loadMovies}
              style={{ padding: '10px 22px' }}
            >
              Thử lại
            </button>
          </Box>
        ) : paged.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.5)' }}>
            Không tìm thấy phim phù hợp.
          </Typography>
        ) : (
          <div className="movies-grid">
            {paged.map((m) => <MoviePosterCard key={m.id} movie={m} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pageCount > 1 && (
          <div className="movies-pagination">
            <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={p === safePage ? 'is-active' : ''}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button type="button" disabled={safePage === pageCount} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        )}
      </Container>
    </Box>
  );
};

export default MoviesPage;
