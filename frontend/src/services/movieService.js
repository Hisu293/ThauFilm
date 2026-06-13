import api from './api';

const STATUS_NOW = ['NOW_SHOWING', 'SHOWING', 'NOWSHOWING'];
const STATUS_SOON = ['COMING_SOON', 'UPCOMING', 'COMINGSOON'];

const placeholderPoster = '/placeholder.svg';

/** Map a raw /api/movies record to the shape the UI expects. */
const mapMovie = (movie) => {
  const status = String(movie.status ?? '').toUpperCase();
  const poster = movie.posterUrl || placeholderPoster;
  return {
    id: movie.id,
    title: movie.title ?? 'Phim chưa đặt tên',
    description: movie.description ?? '',
    poster,
    posterUrl: poster,
    backdropUrl: poster,
    genre: movie.genre ?? 'Đang cập nhật',
    rating: movie.rated ?? movie.rating ?? 'P',
    director: movie.director ?? '',
    actors: movie.actors ?? '',
    language: movie.language ?? '',
    duration: movie.durationMinutes ?? null,
    releaseDate: movie.releaseDate ?? null,
    releaseYear: movie.releaseDate ? Number(String(movie.releaseDate).slice(0, 4)) : undefined,
    popularity: movie.rating ?? 0,
    isNowShowing: STATUS_NOW.includes(status),
    isComingSoon: STATUS_SOON.includes(status),
    status: movie.status ?? 'NOW_SHOWING',
  };
};

export const normalizeMovies = (rawList = []) => rawList.map(mapMovie);

/** GET /api/movies */
export const fetchMovies = async () => {
  const { data } = await api.get('/api/movies');
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  return { movies: normalizeMovies(list), source: 'api' };
};

/** Pick up to `max` featured movies by popularity. */
export const selectFeatured = (movies = [], max = 5) =>
  [...movies]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, max);
