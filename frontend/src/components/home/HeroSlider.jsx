import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import './HeroSlider.css';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 55;

const HeroSlider = ({ movies = [], loading = false }) => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef(null);
  const dragRef = useRef(null);
  const count = movies.length;

  const goTo = useCallback((i) => setActive((i + count) % count), [count]);
  const next = useCallback(() => setActive((p) => (p + 1) % count), [count]);
  const prev = useCallback(() => setActive((p) => (p - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [count, next, active]);

  const handlePointerDown = (event) => {
    if (count <= 1 || event.button !== 0 || event.target.closest('button, a, input, select, textarea')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      horizontal: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.currentX = event.clientX;
    const distanceX = event.clientX - drag.startX;
    const distanceY = event.clientY - drag.startY;
    if (!drag.horizontal && Math.abs(distanceX) > 10 && Math.abs(distanceX) > Math.abs(distanceY)) {
      drag.horizontal = true;
      setDragging(true);
    }
    if (drag.horizontal) event.preventDefault();
  };

  const finishDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distanceX = drag.currentX - drag.startX;
    if (drag.horizontal && Math.abs(distanceX) >= SWIPE_THRESHOLD_PX) {
      if (distanceX < 0) next();
      else prev();
    }
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
    <div
      className={`hero-slider ${dragging ? 'is-dragging' : ''}`}
      aria-roledescription="carousel"
      aria-label="Phim nổi bật. Kéo ngang để đổi phim."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      {movies.map((movie, i) => (
        <div key={movie.id ?? i} className={`hero-slide ${i === active ? 'is-active' : ''}`} aria-hidden={i !== active}>
          <div className="hero-slide__bg" style={{ backgroundImage: `url(${bgOf(movie)})` }} />
          <div className="hero-slide__overlay" />
          <div className="hero-slide__content">
            <h2 className="hero-title">{movie.title}</h2>
            <div className="hero-meta">
              <span className="hero-meta__chip hero-meta__chip--rating">{movie.rating || 'P'}</span>
              <span className="hero-meta__chip hero-meta__chip--star">
                <StarRoundedIcon sx={{ fontSize: 16 }} />
                {(movie.popularity ? Math.min(9.9, 7 + (movie.popularity % 30) / 10) : 8.4).toFixed(1)}
              </span>
              {movie.genre && <span className="hero-meta__chip">{movie.genre}</span>}
              {movie.releaseYear && <span className="hero-meta__chip">{movie.releaseYear}</span>}
            </div>
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
          <div className="hero-dots">
            {movies.map((m, i) => (
              <button
                key={m.id ?? i}
                type="button"
                className={`hero-dot ${i === active ? 'is-active' : ''}`}
                onClick={() => goTo(i)}
                style={{ backgroundImage: `url(${bgOf(m)})` }}
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
