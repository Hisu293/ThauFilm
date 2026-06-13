import { useNavigate } from 'react-router-dom';
import './MoviePosterCard.css';

const MoviePosterCard = ({ movie }) => {
  const navigate = useNavigate();
  const go = () => navigate(`/movies/${movie.id}`);

  return (
    <article className="mp-card" onClick={go}>
      <div className="mp-card__media">
        <img
          className="mp-card__poster"
          src={movie.posterUrl || movie.poster || '/placeholder.svg'}
          alt={movie.title}
          loading="lazy"
          decoding="async"
        />
        <span className="mp-card__rating">{movie.rating || 'P'}</span>
        <div className="mp-card__overlay">
          <button type="button" className="mp-card__cta" onClick={(e) => { e.stopPropagation(); navigate(`/movies/${movie.id}?book=1`); }}>
            Đặt vé
          </button>
        </div>
      </div>
      <div className="mp-card__body">
        <h3 className="mp-card__title" title={movie.title}>{movie.title}</h3>
        <div className="mp-card__meta">
          {movie.genre && <span><b>{movie.genre}</b></span>}
          {movie.duration && <span>{movie.duration}'</span>}
          {(movie.releaseYear || movie.releaseDate) && (
            <span>{movie.releaseYear || String(movie.releaseDate).slice(0, 10)}</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default MoviePosterCard;
