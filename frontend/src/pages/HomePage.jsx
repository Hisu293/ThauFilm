import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import HeroSlider from '../components/home/HeroSlider';
import QuickBooking from '../components/home/QuickBooking';
import MoviePosterCard from '../components/movies/MoviePosterCard';
import { fetchMovies, selectFeatured } from '../services/movieService';
import './HomePage.css';

const MovieConveyor = ({ movies }) => {
  const railRef = useRef(null);
  const dragRef = useRef(null);
  const pausedRef = useRef(false);
  const draggedRef = useRef(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frameId;
    let previousTime = performance.now();
    const tick = (time) => {
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;
      if (!pausedRef.current && !dragRef.current && rail.scrollWidth > rail.clientWidth) {
        const loopWidth = rail.scrollWidth / 2;
        scrollPositionRef.current += elapsed * 0.025;
        if (scrollPositionRef.current >= loopWidth) scrollPositionRef.current -= loopWidth;
        rail.scrollLeft = scrollPositionRef.current;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [movies]);

  const handlePointerDown = (event) => {
    if (
      event.button !== 0
      || event.target.closest('input, select, textarea')
    ) return;
    draggedRef.current = false;
    scrollPositionRef.current = railRef.current.scrollLeft;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: railRef.current.scrollLeft,
    };
    pausedRef.current = true;
    railRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !rail) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 6) draggedRef.current = true;
    const loopWidth = rail.scrollWidth / 2;
    let nextScrollLeft = drag.startScrollLeft - distance;
    if (loopWidth > 0) {
      while (nextScrollLeft < 0) nextScrollLeft += loopWidth;
      while (nextScrollLeft >= loopWidth) nextScrollLeft -= loopWidth;
    }
    scrollPositionRef.current = nextScrollLeft;
    rail.scrollLeft = nextScrollLeft;
    if (draggedRef.current) event.preventDefault();
  };

  const finishDrag = (event) => {
    const rail = railRef.current;
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId || !rail) return;
    dragRef.current = null;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    pausedRef.current = false;
  };

  const blockClickAfterDrag = (event) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  return (
    <div
      ref={railRef}
      className="home-movie-rail home-movie-rail--marquee"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') pausedRef.current = true;
      }}
      onPointerLeave={(event) => {
        // Pointer capture keeps touch/pen dragging active outside the rail.
        if (event.pointerType === 'mouse') {
          if (dragRef.current) finishDrag(event);
          pausedRef.current = false;
        }
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={blockClickAfterDrag}
      aria-label="Danh sách phim tự chạy. Kéo ngang để xem thêm."
    >
      <div className="home-movie-track">
        <div className="home-movie-group">
          {movies.map((movie) => <MoviePosterCard key={movie.id} movie={movie} />)}
        </div>
        <div className="home-movie-group">
          {movies.map((movie) => <MoviePosterCard key={`${movie.id}-copy`} movie={movie} />)}
        </div>
      </div>
    </div>
  );
};

const HomeMovieRail = ({ eyebrow, title, description, movies, icon, loading, onViewAll }) => (
  <section className="home-movie-section">
    <header className="home-section-head">
      <div>
        <span className="home-section-eyebrow">{icon}{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button type="button" className="home-view-all" onClick={onViewAll}>
        Xem tất cả <ArrowForwardRoundedIcon fontSize="small" />
      </button>
    </header>

    {loading ? (
      <div className="home-movie-rail" aria-label="Đang tải phim">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="home-card-skeleton" />)}
      </div>
    ) : movies.length > 1 ? (
      <MovieConveyor movies={movies} />
    ) : movies.length === 1 ? (
      <div className="home-movie-rail">
        <MoviePosterCard movie={movies[0]} />
      </div>
    ) : (
      <div className="home-empty">Chưa có phim trong danh mục này.</div>
    )}
  </section>
);

const HomePage = () => {
  const navigate = useNavigate();
  const [apiMovies, setApiMovies] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMovies()
      .then(({ movies }) => {
        if (active) setApiMovies(movies);
      })
      .catch(() => {
        if (active) setApiMovies([]);
      })
      .finally(() => {
        if (active) setApiLoading(false);
      });
    return () => { active = false; };
  }, []);

  const featuredSlides = useMemo(() => selectFeatured(apiMovies, 5), [apiMovies]);
  const nowShowing = useMemo(() => apiMovies.filter((movie) => movie.isNowShowing), [apiMovies]);
  const comingSoon = useMemo(() => apiMovies.filter((movie) => movie.isComingSoon), [apiMovies]);

  return (
    <main className="home-page">
      <HeroSlider movies={featuredSlides} loading={apiLoading} />
      <QuickBooking />

      <div className="home-catalog">
        <HomeMovieRail
          eyebrow="ĐANG ĐƯỢC QUAN TÂM"
          title="Phim đang chiếu"
          description="Những bộ phim nổi bật đang có suất chiếu tại hệ thống ThauFilm."
          movies={nowShowing}
          loading={apiLoading}
          icon={<LocalFireDepartmentRoundedIcon fontSize="small" />}
          onViewAll={() => navigate('/movies?tab=now')}
        />

        <HomeMovieRail
          eyebrow="SẮP RA MẮT"
          title="Đón xem tiếp theo"
          description="Lưu lại những câu chuyện sắp xuất hiện trên màn ảnh rộng."
          movies={comingSoon}
          loading={apiLoading}
          icon={<ScheduleRoundedIcon fontSize="small" />}
          onViewAll={() => navigate('/movies?tab=soon')}
        />
      </div>
    </main>
  );
};

export default HomePage;
