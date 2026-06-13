import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth } from '../context/AuthContext';
import { getListFilmMovieById } from '../data/listFilmCatalog';
import { movies as defaultMovies } from '../data/movies';

const MovieDetailPage = () => {
  const { id } = useParams();
  const { isLoggedIn } = useAuth();

  const movie =
    (isLoggedIn ? getListFilmMovieById(id) : null) ||
    defaultMovies.find((m) => String(m.id) === String(id));

  if (!movie) {
    return (
      <Container sx={{ py: 8, color: '#fff' }}>
        <Typography variant="h5">Không tìm thấy phim.</Typography>
        <Button component={RouterLink} to="/" sx={{ mt: 2 }}>
          Về trang chủ
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0b0b', color: '#fff', py: 4 }}>
      <Container maxWidth="lg">
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mb: 3, color: 'rgba(255,255,255,0.8)' }}
        >
          Trang chủ
        </Button>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
          <Box
            component="img"
            src={movie.poster}
            alt={movie.title}
            sx={{
              width: { xs: '100%', md: 320 },
              maxHeight: 480,
              objectFit: 'cover',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Chip label={movie.genre} color="primary" size="small" sx={{ mb: 1.5, fontWeight: 700 }} />
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
              {movie.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.8, mb: 3 }}>
              {movie.description}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              <Chip label={`${movie.duration || '—'} phút`} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
              <Chip label={movie.rating} color="error" variant="outlined" />
              {movie.hashId && (
                <Chip
                  label={`Hash #${movie.hashId}`}
                  variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}
                />
              )}
            </Stack>
            {!movie.isComingSoon && (
              <Button variant="contained" color="error" size="large" sx={{ fontWeight: 800, px: 4 }}>
                Đặt vé · ₫{movie.price?.toLocaleString('vi-VN')}
              </Button>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default MovieDetailPage;
