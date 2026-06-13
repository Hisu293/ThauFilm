import { useMemo, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { listFilmMovies } from '../data/listFilmCatalog';
import MoviePosterCard from '../components/movies/MoviePosterCard';
import './MoviesPage.css';

const TABS = ['Đang Chiếu', 'Sắp Chiếu', 'Phim Hot', 'IMAX'];
const COUNTRIES = ['Tất cả', 'Mỹ', 'Hàn Quốc', 'Việt Nam', 'Nhật Bản'];
const PAGE_SIZE = 10;

// Enrich the local catalog with derived flags so the tabs/filters have data to work with.
const CATALOG = listFilmMovies.map((m, i) => ({
  ...m,
  releaseYear: m.releaseDate ? Number(String(m.releaseDate).slice(0, 4)) : 2025 + (i % 2),
  country: COUNTRIES[1 + (i % (COUNTRIES.length - 1))],
  isHot: i % 3 === 0,
  isImax: i % 4 === 0,
  isComingSoon: m.isComingSoon || i % 5 === 0,
}));

const GENRES = ['Tất cả', ...Array.from(new Set(CATALOG.map((m) => m.genre))).sort()];
const YEARS = ['Tất cả', ...Array.from(new Set(CATALOG.map((m) => m.releaseYear))).sort((a, b) => b - a)];

const MoviesPage = () => {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Tất cả');
  const [country, setCountry] = useState('Tất cả');
  const [year, setYear] = useState('Tất cả');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((m) => {
      if (tab === 0 && !m.isNowShowing) return false;
      if (tab === 1 && !m.isComingSoon) return false;
      if (tab === 2 && !m.isHot) return false;
      if (tab === 3 && !m.isImax) return false;
      if (q && !m.title.toLowerCase().includes(q)) return false;
      if (genre !== 'Tất cả' && m.genre !== genre) return false;
      if (country !== 'Tất cả' && m.country !== country) return false;
      if (year !== 'Tất cả' && String(m.releaseYear) !== String(year)) return false;
      return true;
    });
  }, [tab, query, genre, country, year]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <Box sx={{ color: '#fff', pb: 8 }}>
      <div className="movies-hero">
        <div className="movies-hero__inner">
          <Typography variant="overline" sx={{ color: '#e50914', fontWeight: 800, letterSpacing: '0.12em' }}>
            THAUFILM
          </Typography>
          <h1 className="movies-hero__title">Khám phá thế giới điện ảnh</h1>
          <p className="movies-hero__sub">Phim đang chiếu, sắp chiếu, bom tấn IMAX — đặt vé chỉ trong vài giây.</p>
        </div>
      </div>

      <Container maxWidth="xl" sx={{ mt: -2 }}>
        <div className="movies-tabs">
          {TABS.map((t, i) => (
            <button key={t} type="button" className={`movies-tab ${i === tab ? 'is-active' : ''}`} onClick={() => { setTab(i); setPage(1); }}>
              {t}
            </button>
          ))}
        </div>

        <div className="movies-toolbar">
          <div className="movies-search">
            <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <input
              placeholder="Tìm phim theo tên…"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
            />
          </div>
          <div className="movies-filters">
            <select value={genre} onChange={(e) => resetPage(setGenre)(e.target.value)}>
              {GENRES.map((g) => <option key={g} value={g}>{g === 'Tất cả' ? 'Thể loại' : g}</option>)}
            </select>
            <select value={country} onChange={(e) => resetPage(setCountry)(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c === 'Tất cả' ? 'Quốc gia' : c}</option>)}
            </select>
            <select value={year} onChange={(e) => resetPage(setYear)(e.target.value)}>
              {YEARS.map((y) => <option key={y} value={y}>{y === 'Tất cả' ? 'Năm' : y}</option>)}
            </select>
          </div>
        </div>

        {paged.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.6)' }}>
            Không tìm thấy phim phù hợp.
          </Typography>
        ) : (
          <div className="movies-grid">
            {paged.map((m) => <MoviePosterCard key={m.id} movie={m} />)}
          </div>
        )}

        {pageCount > 1 && (
          <div className="movies-pagination">
            <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" className={p === safePage ? 'is-active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button type="button" disabled={safePage === pageCount} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        )}
      </Container>
    </Box>
  );
};

export default MoviesPage;
