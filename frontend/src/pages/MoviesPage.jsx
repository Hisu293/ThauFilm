import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MoviePosterCard from '../components/movies/MoviePosterCard';
import { fetchMovies } from '../services/movieService';
import './MoviesPage.css';

const TABS = [
  { label: 'Tất cả', key: 'all' },
  { label: 'Đang Chiếu', key: 'now' },
  { label: 'Sắp Chiếu', key: 'soon' },
];

const PAGE_SIZE = 12;

const MoviesPage = () => {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Tất cả');
  const [page, setPage] = useState(1);

  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { movies } = await fetchMovies();
      setAllMovies(movies);
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
