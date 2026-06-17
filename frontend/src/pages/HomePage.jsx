import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import FilterPanel from '../components/FilterPanel';
import HeroSlider from '../components/home/HeroSlider';
import QuickBooking from '../components/home/QuickBooking';
import MovieGrid from '../components/MovieGrid';
import { fetchMovies, selectFeatured } from '../services/movieService';
import { t } from '../i18n/labels';

const ALL_GENRES = 'Tất cả thể loại';
const ALL_LOCATIONS = 'Tất cả khu vực';
const locations = [ALL_LOCATIONS, 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
const MOVIES_PER_PAGE = 8;

const HomePage = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_GENRES);
  const [location, setLocation] = useState(ALL_LOCATIONS);
  const [movieTab, setMovieTab] = useState('nowShowing');
  const [visibleMovies, setVisibleMovies] = useState(MOVIES_PER_PAGE);

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
  const activeMovies = movieTab === 'nowShowing' ? nowShowing : comingSoon;
  const visibleMovieList = activeMovies.slice(0, visibleMovies);
  const hasMoreMovies = visibleMovies < activeMovies.length;

  useEffect(() => {
    setVisibleMovies(MOVIES_PER_PAGE);
  }, [query, category, location]);

  const handleMovieTabChange = (_event, value) => {
    setMovieTab(value);
    setVisibleMovies(MOVIES_PER_PAGE);
  };

  const handleLoadMore = () => {
    setVisibleMovies((count) => Math.min(count + MOVIES_PER_PAGE, activeMovies.length));
  };

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

        <Box
          component="section"
          sx={{
            maxWidth: 1240,
            mx: 'auto',
            mb: 4,
            pt: { xs: 1, md: 2 },
          }}
        >
          <Stack spacing={2.5} alignItems="center" sx={{ mb: { xs: 3, md: 4 } }}>
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontWeight: 900,
                textAlign: 'center',
                letterSpacing: 0,
                fontSize: { xs: '1.65rem', md: '2.2rem' },
              }}
            >
              {t('movies', 'title')}
            </Typography>

            <Tabs
              value={movieTab}
              onChange={handleMovieTabChange}
              centered
              aria-label="Movie status tabs"
              sx={{
                minHeight: 46,
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 99,
                  backgroundColor: '#e50914',
                },
                '& .MuiTab-root': {
                  minHeight: 46,
                  px: { xs: 1.5, sm: 3 },
                  color: 'rgba(255,255,255,0.58)',
                  fontWeight: 900,
                  fontSize: { xs: '0.86rem', sm: '0.98rem' },
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                },
                '& .Mui-selected': {
                  color: '#fff',
                },
              }}
            >
              <Tab value="nowShowing" label={t('movies', 'nowShowing')} />
              <Tab value="comingSoon" label={t('movies', 'comingSoon')} />
            </Tabs>
          </Stack>

          <MovieGrid movies={visibleMovieList} variant={movieTab} />

          {!apiLoading && activeMovies.length === 0 && (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {movieTab === 'nowShowing' ? t('movies', 'noMatches') : t('movies', 'noComingSoon')}
            </Typography>
          )}

          {activeMovies.length > 0 && (
            <Stack alignItems="center" sx={{ mt: { xs: 4, md: 5 } }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={!hasMoreMovies}
                sx={{
                  minWidth: 148,
                  borderRadius: 999,
                  px: 3,
                  py: 1.1,
                  color: '#fff',
                  borderColor: hasMoreMovies ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)',
                  textTransform: 'none',
                  fontWeight: 800,
                  '&:hover': {
                    borderColor: '#e50914',
                    backgroundColor: 'rgba(229,9,20,0.12)',
                  },
                }}
              >
                {t('common', 'loadMore')}
              </Button>
            </Stack>
          )}
        </Box>
      </Container>
    </>
  );
};

export default HomePage;
