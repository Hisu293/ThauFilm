import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import MovieCard from '../components/MovieCard';
import '../components/MovieCard.css';
import FilterPanel from '../components/FilterPanel';
import HeroSlider from '../components/home/HeroSlider';
import QuickBooking from '../components/home/QuickBooking';
import { fetchMovies, selectFeatured } from '../services/movieService';

const ALL_GENRES = 'Tất cả thể loại';
const ALL_LOCATIONS = 'Tất cả khu vực';
const locations = [ALL_LOCATIONS, 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];

const HomePage = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_GENRES);
  const [location, setLocation] = useState(ALL_LOCATIONS);

  const [apiMovies, setApiMovies] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMovies()
      .then(({ movies: list }) => {
        if (active) setApiMovies(list);
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

  const movies = apiMovies;

  const genres = useMemo(() => {
    const set = new Set(apiMovies.map((m) => m.genre).filter(Boolean));
    return [ALL_GENRES, ...set];
  }, [apiMovies]);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movies.filter((movie) => {
      const title = (movie.title || '').toLowerCase();
      const genre = (movie.genre || '').toLowerCase();
      const matchesSearch = !normalizedQuery || title.includes(normalizedQuery) || genre.includes(normalizedQuery);
      const matchesCategory = category === ALL_GENRES || movie.genre === category;
      const matchesLocation = location === ALL_LOCATIONS || (movie.description || '').toLowerCase().includes(location.toLowerCase());
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [movies, query, category, location]);

  const nowShowing = filteredMovies.filter((movie) => movie.isNowShowing);
  const comingSoon = filteredMovies.filter((movie) => movie.isComingSoon);

  return (
    <>
      <HeroSlider movies={featuredSlides} loading={apiLoading} />
      <QuickBooking />

      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <FilterPanel
          query={query}
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
          categories={genres}
          location={location}
          onLocationChange={setLocation}
          locations={locations}
        />

        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              Đang chiếu
            </Typography>
            <Button variant="text" color="primary" sx={{ textTransform: 'none', fontWeight: 700 }}>
              Xem tất cả →
            </Button>
          </Stack>
          <Box className="movie-grid">
            {nowShowing.map((movie) => (
              <MovieCard key={movie.id} movie={movie} variant="nowShowing" />
            ))}
          </Box>
          {!apiLoading && nowShowing.length === 0 && (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Không tìm thấy phim phù hợp.
            </Typography>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              Sắp chiếu
            </Typography>
            <Button variant="text" color="primary" sx={{ textTransform: 'none', fontWeight: 700 }}>
              Xem tất cả →
            </Button>
          </Stack>
          <Box className="movie-grid">
            {comingSoon.map((movie) => (
              <MovieCard key={movie.id} movie={movie} variant="comingSoon" />
            ))}
          </Box>
          {!apiLoading && comingSoon.length === 0 && (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Không có phim sắp chiếu.
            </Typography>
          )}
        </Box>
      </Container>
    </>
  );
};

export default HomePage;
