import { Link as RouterLink } from 'react-router-dom';
import './MovieCard.css';

const formatReleaseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const MovieCard = ({ movie, variant = 'nowShowing' }) => {
  const isComingSoon = variant === 'comingSoon';
  const releaseDate = formatReleaseDate(movie.releaseDate);

  return (
    <article className={`movie-card ${isComingSoon ? 'movie-card--soon' : ''}`}>
      <div className="movie-card__media">
        <img
          src={movie.poster}
          alt={movie.title}
          className="movie-card__poster"
          loading="lazy"
          decoding="async"
        />
        <span className="movie-card__badge movie-card__badge--genre">{movie.genre || 'Đang cập nhật'}</span>
        <span className="movie-card__badge movie-card__badge--rating">{movie.rating || 'P'}</span>
      </div>

      <div className="movie-card__body">
        <h3 className="movie-card__title" title={movie.title}>
          {movie.title}
        </h3>

        <div className="movie-card__meta">
          {isComingSoon ? (
            <span>{releaseDate ? `Khởi chiếu ${releaseDate}` : 'Sắp ra mắt'}</span>
          ) : (
            <span>{movie.duration ? `${movie.duration} phút` : 'Đang cập nhật'}</span>
          )}
        </div>

        <RouterLink
          to={`/movies/${movie.id}`}
          className={`movie-card__btn ${isComingSoon ? 'movie-card__btn--ghost' : 'movie-card__btn--primary'}`}
        >
          {isComingSoon ? 'Xem chi tiết' : 'Đặt vé'}
        </RouterLink>
      </div>
    </article>
  );
};

export default MovieCard;
