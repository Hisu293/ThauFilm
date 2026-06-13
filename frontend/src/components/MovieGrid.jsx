import MovieCard from './MovieCard';
import './MovieGrid.css';

const MovieGrid = ({ movies = [] }) => {
  return (
    <section className="movie-grid">
      {movies.map(movie => (
        <MovieCard
          key={movie.id}
          id={movie.id}
          title={movie.title}
          image={movie.poster}
          genre={movie.genre}
          duration={movie.duration}
          rating={movie.rating}
          price={movie.price}
        />
      ))}
    </section>
  );
};

export default MovieGrid;
