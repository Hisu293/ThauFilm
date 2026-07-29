import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import MoviePosterCard from '../components/movies/MoviePosterCard';
import { fetchMovies } from '../services/movieService';
import './MoviesPage.css';

const MovieGlobe = ({
  movies,
  title,
  tone = 'now',
}) => {
  const [rotation, setRotation] = useState({ x: -0.08, y: 0 });
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const pausedRef = useRef(false);

  const points = useMemo(() => {
    const tileCount = Math.max(movies.length, 24);
    const columns = Math.max(8, Math.ceil(tileCount / 3));
    const rows = Math.ceil(tileCount / columns);
    return Array.from({ length: tileCount }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const latitude = rows === 1 ? 0 : ((row / (rows - 1)) - 0.5) * 1.35;
      const longitude = (column / columns) * Math.PI * 2
        + (row % 2 ? Math.PI / columns : 0);
      return {
        movie: movies[index % movies.length],
        tileIndex: index,
        latitude,
        longitude,
      };
    });
  }, [movies]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frameId;
    let previousTime = performance.now();
    const animate = (time) => {
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;
      if (!pausedRef.current && !dragRef.current) {
        setRotation((current) => ({ ...current, y: current.y + elapsed * 0.0001 }));
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const projected = points.map((point) => {
    const longitude = point.longitude + rotation.y;
    const latitude = point.latitude + rotation.x * 0.52;
    const latitudeRadius = Math.cos(latitude);
    return {
      ...point,
      screenX: Math.sin(longitude) * latitudeRadius,
      screenY: Math.sin(latitude),
      depth: Math.cos(longitude) * latitudeRadius,
    };
  });

  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('button, a, input, [role="dialog"]')) return;
    draggedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) draggedRef.current = true;
    setRotation({
      x: Math.max(-0.62, Math.min(0.62, drag.rotation.x - (event.clientY - drag.y) * 0.004)),
      y: drag.rotation.y + (event.clientX - drag.x) * 0.004,
    });
  };

  const finishDrag = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className={`cinema-planet cinema-planet--${tone}`}>
      <div
        className="cinema-globe"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={(event) => {
          finishDrag(event);
          pausedRef.current = false;
        }}
        onClickCapture={(event) => {
          if (!draggedRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }}
        aria-label={`${title} gồm ${movies.length} phim`}
      >
        <div className="cinema-globe__mosaic-glow" />

        {projected.map(({ movie, tileIndex, screenX, screenY, depth }) => {
          const scale = 0.7 + ((depth + 1) / 2) * 0.34;
          const opacity = 0.18 + ((depth + 1) / 2) * 0.82;
          const isFront = depth > 0.02;
          return (
            <div
              key={`${movie.id}-${tileIndex}`}
              className={`cinema-globe__movie ${isFront ? 'is-front' : ''}`}
              style={{
                left: `${50 + screenX * 35}%`,
                top: `${52 + screenY * 39}%`,
                transform: `translate3d(-50%, -50%, 0) scale(${scale})`,
                opacity,
                zIndex: Math.round((depth + 1) * 100),
              }}
              onPointerEnter={() => { pausedRef.current = true; }}
              onPointerLeave={() => { pausedRef.current = false; }}
            >
              <MoviePosterCard movie={movie} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const MoviesPage = () => {
  const [allMovies, setAllMovies] = useState([]);
  const [activePlanet, setActivePlanet] = useState('now');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMovies();
      setAllMovies(result.movies || []);
    } catch (loadError) {
      setError(loadError.message || 'Không tải được danh sách phim đang chiếu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Tải dữ liệu khi trang được mở; các cập nhật state thực tế diễn ra sau khi request hoàn tất.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovies();
  }, [loadMovies]);

  if (loading) {
    return (
      <Box className="cinema-planet-state">
        <CircularProgress sx={{ color: '#e50914' }} />
        <Typography>Đang tạo hành tinh phim…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="cinema-planet-state">
        <Typography sx={{ color: '#f87171' }}>{error}</Typography>
        <button type="button" onClick={loadMovies}>Thử lại</button>
      </Box>
    );
  }

  const nowShowing = allMovies.filter((movie) => movie.isNowShowing);
  const comingSoon = allMovies.filter((movie) => movie.isComingSoon && !movie.isNowShowing);
  const showingComingSoon = (activePlanet === 'soon' || !nowShowing.length) && comingSoon.length > 0;
  const displayedPlanet = showingComingSoon ? 'soon' : 'now';
  const activeMovies = showingComingSoon ? comingSoon : nowShowing;

  if (!nowShowing.length && !comingSoon.length) {
    return (
      <Box className="cinema-planet-state">
        <Typography>Hiện chưa có phim đang chiếu hoặc sắp chiếu.</Typography>
      </Box>
    );
  }

  return (
    <main className="movies-planet-page">
      <nav className="planet-switcher" aria-label="Chuyển loại hành tinh phim">
        <button
          type="button"
          className={displayedPlanet === 'now' ? 'is-active' : ''}
          onClick={() => setActivePlanet('now')}
          disabled={!nowShowing.length}
        >
          <span className="planet-switcher__dot planet-switcher__dot--now" />
          <span>
            <small>Đang phát hành</small>
            ThauFilm đang chiếu
          </span>
          <strong>{nowShowing.length}</strong>
        </button>
        <button
          type="button"
          className={displayedPlanet === 'soon' ? 'is-active' : ''}
          onClick={() => setActivePlanet('soon')}
          disabled={!comingSoon.length}
        >
          <span className="planet-switcher__dot planet-switcher__dot--soon" />
          <span>
            <small>Sắp ra mắt</small>
            ThauFilm sắp chiếu
          </span>
          <strong>{comingSoon.length}</strong>
        </button>
      </nav>

      <MovieGlobe
        key={showingComingSoon ? 'soon' : 'now'}
        movies={activeMovies}
        title={showingComingSoon ? 'Hành tinh phim sắp chiếu' : 'Hành tinh phim đang chiếu'}
        tone={showingComingSoon ? 'soon' : 'now'}
      />
    </main>
  );
};

export default MoviesPage;
