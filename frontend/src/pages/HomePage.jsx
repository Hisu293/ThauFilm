import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import HeroSlider from '../components/home/HeroSlider';
import QuickBooking from '../components/home/QuickBooking';
import MovieGrid from '../components/MovieGrid';
import { fetchMovies, selectFeatured } from '../services/movieService';
import { t } from '../i18n/labels';

const MOVIES_PER_PAGE = 8;

const HomePage = () => {
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

  const nowShowing = movies.filter((movie) => movie.isNowShowing);
  const comingSoon = movies.filter((movie) => movie.isComingSoon);
  const activeMovies = movieTab === 'nowShowing' ? nowShowing : comingSoon;
  const visibleMovieList = activeMovies.slice(0, visibleMovies);
  const hasMoreMovies = visibleMovies < activeMovies.length;

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
