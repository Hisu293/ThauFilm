import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import './HeroSlider.css';

const AUTOPLAY_MS = 5000;

const HeroSlider = ({ movies = [], loading = false }) => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const count = movies.length;

  const goTo = useCallback((i) => setActive((i + count) % count), [count]);
  const next = useCallback(() => setActive((p) => (p + 1) % count), [count]);
  const prev = useCallback(() => setActive((p) => (p - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [count, next, active]);

  if (loading) {
    return (
      <div className="hero-slider">
        <div className="hero-skeleton" />
      </div>
    );
  }
  if (!count) return null;

  const bgOf = (m) => m.backdropUrl || m.posterUrl || '/placeholder.svg';

  return (
    <div className="hero-slider" aria-roledescription="carousel">
      {movies.map((movie, i) => (
        <div key={movie.id ?? i} className={`hero-slide ${i === active ? 'is-active' : ''}`} aria-hidden={i !== active}>
          <div className="hero-slide__bg" style={{ backgroundImage: `url(${bgOf(movie)})` }} />
          <div className="hero-slide__overlay" />
          <div className="hero-slide__content">
            <div className="hero-meta">
              <span className="hero-meta__chip hero-meta__chip--rating">{movie.rating || 'P'}</span>
              <span className="hero-meta__chip hero-meta__chip--star">
                <StarRoundedIcon sx={{ fontSize: 16 }} />
                {(movie.popularity ? Math.min(9.9, 7 + (movie.popularity % 30) / 10) : 8.4).toFixed(1)}
              </span>
              {movie.genre && <span className="hero-meta__chip">{movie.genre}</span>}
              {movie.releaseYear && <span className="hero-meta__chip">{movie.releaseYear}</span>}
            </div>
            <h2 className="hero-title">{movie.title}</h2>
            {movie.description && <p className="hero-desc">{movie.description}</p>}
            <div className="hero-actions">
              <button type="button" className="hero-btn hero-btn--solid" onClick={() => navigate(`/movies/${movie.id}?trailer=1`)}>
                <PlayArrowRoundedIcon sx={{ fontSize: 20 }} /> Xem Trailer
              </button>
              <button type="button" className="hero-btn hero-btn--primary" onClick={() => navigate(`/movies/${movie.id}?book=1`)}>
                <ConfirmationNumberRoundedIcon sx={{ fontSize: 20 }} /> Đặt Vé
              </button>
              <button type="button" className="hero-btn hero-btn--ghost" onClick={() => navigate(`/movies/${movie.id}`)}>
                <InfoOutlinedIcon sx={{ fontSize: 20 }} /> Chi Tiết
              </button>
            </div>
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <button type="button" className="hero-arrow hero-arrow--prev" onClick={prev} aria-label="Phim trước">
            <ChevronLeftRoundedIcon />
          </button>
          <button type="button" className="hero-arrow hero-arrow--next" onClick={next} aria-label="Phim sau">
            <ChevronRightRoundedIcon />
          </button>
          <div className="hero-dots">
            {movies.map((m, i) => (
              <button
                key={m.id ?? i}
                type="button"
                className={`hero-dot ${i === active ? 'is-active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Chuyển tới slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroSlider;
