import { Star, Clock, MapPin, PlayCircle, Calendar } from 'lucide-react';
import './FeaturedMovie.css';

const FeaturedMovie = ({ movie }) => {
  return (
    <section className="featured-movie">
      <div className="featured-movie__container">
        <div className="featured-movie__content">
          <div className="featured-movie__badges">
            <span className="featured-movie__badge featured-movie__badge--featured">
              <Star size={14} /> Featured Today
            </span>
            <span className="featured-movie__badge featured-movie__badge--genre">
              {movie.genre}
            </span>
          </div>
          <h1 className="featured-movie__title">{movie.title}</h1>
          <p className="featured-movie__description">{movie.description}</p>
          <div className="featured-movie__meta">
            <div className="featured-movie__meta-item">
              <Clock size={16} /> <span>{movie.duration} min</span>
            </div>
            {movie.releaseDate && (
              <div className="featured-movie__meta-item">
                <Calendar size={16} /> <span>{movie.releaseDate}</span>
              </div>
            )}
            <div className="featured-movie__meta-item">
              <MapPin size={16} /> <span>Bangkok, ICT</span>
            </div>
            <div className="featured-movie__meta-item featured-movie__meta-item--rating">
              {movie.rating}
            </div>
          </div>
          <div className="featured-movie__actions">
            <button type="button" className="featured-movie__button featured-movie__button--primary">
              <PlayCircle size={18} /> Book Now
            </button>
            <button type="button" className="featured-movie__button featured-movie__button--ghost">
              View Trailer
            </button>
          </div>
        </div>
        <div className="featured-movie__poster">
          <div className="featured-movie__poster-card">
            <img src={movie.poster} alt={movie.title} />
            <div className="featured-movie__poster-footer">
              <span>NOW SHOWING</span>
              <strong>{movie.title}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMovie;
