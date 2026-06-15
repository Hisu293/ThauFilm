import api from './api';

const STATUS_NOW = ['NOW_SHOWING', 'SHOWING', 'NOWSHOWING'];
const STATUS_SOON = ['COMING_SOON', 'UPCOMING', 'COMINGSOON'];

const placeholderPoster = '/placeholder.svg';

/** Map a raw /api/movies record to the shape the UI expects. */
const mapMovie = (movie) => {
  const status = String(movie.status ?? '').toUpperCase();
  
  let poster = movie.posterUrl || placeholderPoster;
  // Chỉ dùng posterUrl từ API, không hard-code fallback ảnh cục bộ
  if (!poster || poster === 'ok' || poster.includes('example.com') || poster.includes('placeholder')) {
    poster = placeholderPoster;
  }

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

/** GET /api/movies/now-showing */
export const fetchNowShowing = async () => {
  const { data } = await api.get('/api/movies/now-showing');
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  return normalizeMovies(list);
};

/** GET /api/movies/coming-soon */
export const fetchComingSoon = async () => {
  const { data } = await api.get('/api/movies/coming-soon');
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  return normalizeMovies(list);
};

/** GET /api/movies/{movieId} — chi tiết 1 phim theo ID.
 *  Backend trả { success, message, data: { id, title, rating (score), rated (age), ... } }
 */
export const fetchMovieById = async (movieId) => {
  const { data } = await api.get(`/api/movies/${movieId}`);
  const raw = data?.data ?? data ?? {};
  const mapped = mapMovie(raw);
  return {
    ...mapped,
    // Tách biệt đúng nghĩa: score = điểm số thực (7.9), ageRating = phân loại tuổi ("PG")
    score: typeof raw.rating === 'number' ? raw.rating : null,
    ageRating: raw.rated ?? null,
    durationMinutes: raw.durationMinutes ?? null,
  };
};

/** Pick up to `max` featured movies by popularity. */
export const selectFeatured = (movies = [], max = 5) =>
  [...movies]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, max);
