import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Dialog, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useNavigate } from 'react-router-dom';
import HlsVideoPlayer from '../components/HlsVideoPlayer';
import { getMovieTrailerUrl } from '../data/movieTrailers';
import { fetchMovies } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import './MoviesPage.css';

const SEGMENTS = 35;
const AUTO_SPEED = 5.5;
const DRAG_SENSITIVITY = 20;
const MAX_TILT = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapAngle = (value) => ((value + 180) % 360 + 360) % 360 - 180;

const buildDomeItems = (movies) => {
  if (!movies.length) return [];
  const xColumns = Array.from({ length: SEGMENTS }, (_, index) => -37 + index * 2);
  const evenRows = [-4, -2, 0, 2, 4];
  const oddRows = [-3, -1, 1, 3, 5];
  let movieIndex = 0;

  return xColumns.flatMap((offsetX, columnIndex) =>
    (columnIndex % 2 === 0 ? evenRows : oddRows).map((offsetY) => {
      const movie = movies[movieIndex % movies.length];
      movieIndex += 1;
      return { movie, offsetX, offsetY, key: `${columnIndex}-${offsetY}-${movie.id}` };
    }),
  );
};

const MoviesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [activeActionKey, setActiveActionKey] = useState('');
  const rootRef = useRef(null);
  const sphereRef = useRef(null);
  const rotationRef = useRef({ x: -9, y: 0 });
  const dragRef = useRef(null);
  const inertiaRef = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMovies();
      setMovies(result.movies || []);
    } catch (loadError) {
      setError(loadError.message || 'Không tải được danh sách phim.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Tải dữ liệu lần đầu; trạng thái loading/error được quản lý trong cùng request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovies();
  }, [loadMovies]);

  const domeItems = useMemo(() => buildDomeItems(movies), [movies]);
  const trailerSrc = useMemo(() => getMovieTrailerUrl(trailerMovie || {}), [trailerMovie]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const updateRadius = () => {
      const { width, height } = root.getBoundingClientRect();
      const minimum = width < 700 ? 370 : 500;
      root.style.setProperty('--radius', `${Math.max(minimum, Math.min(width * 0.62, height * 1.15))}px`);
    };
    updateRadius();
    const observer = new ResizeObserver(updateRadius);
    observer.observe(root);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere || !domeItems.length) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId;
    let previous = performance.now();

    const render = (time) => {
      const elapsed = Math.min(time - previous, 50);
      previous = time;
      const rotation = rotationRef.current;

      if (!dragRef.current) {
        if (!reduceMotion) rotation.y = wrapAngle(rotation.y + (AUTO_SPEED * elapsed) / 1000);
        rotation.x = clamp(rotation.x + inertiaRef.current.x * elapsed, -MAX_TILT, MAX_TILT);
        rotation.y = wrapAngle(rotation.y + inertiaRef.current.y * elapsed);
        inertiaRef.current.x *= Math.pow(0.91, elapsed / 16);
        inertiaRef.current.y *= Math.pow(0.91, elapsed / 16);
      }

      sphere.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`;
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [domeItems.length]);

  const handlePointerDown = (event) => {
    // Buttons inside a poster must keep ownership of the pointer through pointerup.
    // Capturing it on the dome page retargets the click to <main>, so the booking
    // navigation and trailer dialog never run.
    if (
      event.button !== 0
      || event.target.closest('button, a, input, select, textarea, [role="link"], .movie-dome-member-bar')
    ) return;
    draggedRef.current = false;
    suppressClickRef.current = false;
    inertiaRef.current = { x: 0, y: 0 };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      rotationX: rotationRef.current.x,
      rotationY: rotationRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 6) draggedRef.current = true;

    const now = performance.now();
    const elapsed = Math.max(8, now - drag.lastTime);
    rotationRef.current.x = clamp(drag.rotationX - deltaY / DRAG_SENSITIVITY, -MAX_TILT, MAX_TILT);
    rotationRef.current.y = wrapAngle(drag.rotationY + deltaX / DRAG_SENSITIVITY);
    inertiaRef.current = {
      x: -((event.clientY - drag.lastY) / DRAG_SENSITIVITY) / elapsed,
      y: ((event.clientX - drag.lastX) / DRAG_SENSITIVITY) / elapsed,
    };
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
  };

  const finishPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    suppressClickRef.current = draggedRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => { suppressClickRef.current = false; }, 120);
  };

  if (loading) {
    return (
      <Box className="movie-dome-state">
        <CircularProgress sx={{ color: '#e50914' }} />
        <Typography>Đang dựng thế giới điện ảnh…</Typography>
      </Box>
    );
  }

  if (error || !movies.length) {
    return (
      <Box className="movie-dome-state">
        <Typography sx={{ color: error ? '#f87171' : 'inherit' }}>
          {error || 'Hiện chưa có phim để hiển thị.'}
        </Typography>
        {error && <button type="button" onClick={loadMovies}>Thử lại</button>}
      </Box>
    );
  }

  return (
    <main
      ref={rootRef}
      className="movie-dome-page"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onDragStart={(event) => event.preventDefault()}
    >
      <div className="movie-dome-page__ambient" aria-hidden="true" />
      <div className="movie-dome-stage">
        <div ref={sphereRef} className="movie-dome-sphere">
          {domeItems.map(({ movie, offsetX, offsetY, key }, index) => (
            <div
              className={`movie-dome-item ${activeActionKey === key ? 'is-actions-open' : ''}`}
              key={key}
              style={{ '--offset-x': offsetX, '--offset-y': offsetY }}
              role="button"
              tabIndex="0"
              onClick={() => {
                if (suppressClickRef.current) return;
                if (window.matchMedia('(hover: none)').matches && activeActionKey !== key) {
                  setActiveActionKey(key);
                  return;
                }
                navigate(`/movies/${movie.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') navigate(`/movies/${movie.id}`);
              }}
              aria-label={`Xem chi tiết ${movie.title}`}
            >
              <span className="movie-dome-item__image">
                <img
                  src={movie.posterUrl || movie.poster || '/placeholder.svg'}
                  alt={movie.title}
                  loading={index < 30 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable="false"
                  onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                />
                <span className="movie-dome-item__actions">
                  {movie.isNowShowing && (
                    <button
                      type="button"
                      aria-label={`Đặt vé ${movie.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!suppressClickRef.current) navigate(`/movies/${movie.id}?book=1`);
                      }}
                    >
                      <ConfirmationNumberRoundedIcon />
                      <span>Đặt vé</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Xem trailer ${movie.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!suppressClickRef.current) setTrailerMovie(movie);
                    }}
                  >
                    <PlayArrowRoundedIcon />
                    <span>Trailer</span>
                  </button>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="movie-dome-page__vignette" aria-hidden="true" />

      {!user && (
        <aside className="movie-dome-member-bar">
          <p>Tham gia ThauFilm để lưu phim, đặt vé và nhận ưu đãi thành viên.</p>
          <div>
            <button type="button" onClick={() => navigate('/login')}>Đăng nhập</button>
            <button type="button" onClick={() => navigate('/register')}>Đăng ký ngay</button>
          </div>
        </aside>
      )}

      <Dialog
        open={Boolean(trailerMovie)}
        onClose={() => setTrailerMovie(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'movie-dome-trailer-dialog' }}
      >
        <div className="movie-dome-trailer">
          <IconButton
            className="movie-dome-trailer__close"
            onClick={() => setTrailerMovie(null)}
            aria-label="Đóng trailer"
          >
            <CloseRoundedIcon />
          </IconButton>
          {trailerSrc ? (
            trailerSrc.includes('youtube.com/embed/') ? (
              <iframe
                src={trailerSrc}
                title={`${trailerMovie?.title || 'Phim'} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <HlsVideoPlayer
                src={trailerSrc}
                title={`${trailerMovie?.title || 'Phim'} Trailer`}
                poster={trailerMovie?.posterUrl || trailerMovie?.poster}
              />
            )
          ) : (
            <div className="movie-dome-trailer__empty">
              <PlayArrowRoundedIcon />
              <strong>Phim này chưa có trailer</strong>
            </div>
          )}
        </div>
      </Dialog>
    </main>
  );
};

export default MoviesPage;
