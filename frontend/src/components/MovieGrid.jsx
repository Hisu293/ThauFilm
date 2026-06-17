import MovieCard from './MovieCard';
import './MovieGrid.css';

const MovieGrid = ({ movies = [], variant = 'nowShowing' }) => {
  return (
    <section className="movie-grid" aria-live="polite">
      {movies.map(movie => (
        <MovieCard
          key={movie.id}
          movie={movie}
          variant={variant}
        />
      ))}
    </section>
  );
};

export default MovieGrid;
