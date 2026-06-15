import { useNavigate } from 'react-router-dom';
import './MoviePosterCard.css';

const MoviePosterCard = ({ movie }) => {
  const navigate = useNavigate();
  const go = () => navigate(`/movies/${movie.id}`);

  // Split multi-genre strings: "Animation, Adventure, Comedy" → ["Animation", "Adventure", "Comedy"]
  const genres = (movie.genre || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 2); // show max 2 genres

  const year = movie.releaseYear || (movie.releaseDate ? String(movie.releaseDate).slice(0, 4) : null);

  return (
    <article className="mp-card" onClick={go}>
      <div className="mp-card__media">
        <img
          className="mp-card__poster"
          src={movie.posterUrl || movie.poster || '/placeholder.svg'}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
        />
        <span className="mp-card__badge">{movie.rating || 'P'}</span>
        {movie.isNowShowing && <span className="mp-card__status-now">Đang chiếu</span>}
        {movie.isComingSoon && !movie.isNowShowing && <span className="mp-card__status-soon">Sắp chiếu</span>}
        <div className="mp-card__overlay">
          <button
            type="button"
            className="mp-card__cta"
            onClick={(e) => { e.stopPropagation(); navigate(`/movies/${movie.id}`); }}
          >
            {movie.isNowShowing ? 'Đặt vé' : 'Xem chi tiết'}
          </button>
        </div>
      </div>
      <div className="mp-card__body">
        <h3 className="mp-card__title" title={movie.title}>{movie.title}</h3>
        <div className="mp-card__meta">
          {genres.length > 0 && (
            <span className="mp-card__genres">{genres.join(', ')}</span>
          )}
          {movie.duration && <span>{movie.duration}′</span>}
          {year && <span>{year}</span>}
        </div>
      </div>
    </article>
  );
};

export default MoviePosterCard;
