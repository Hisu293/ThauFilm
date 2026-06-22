import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useParams } from 'react-router-dom';
import MovieCommunity from '../components/social/MovieCommunity';
import { fetchMovieById } from '../services/movieService';

export default function MovieCommunityPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchMovieById(id)
      .then((result) => { if (active) setMovie(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [id]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 7 } }}>
      <Container maxWidth="xl">
        <Button component={RouterLink} to={`/movies/${id}`} startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3 }}>
          Quay lại trang phim
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {!movie && !error && <Stack alignItems="center" py={10}><CircularProgress /></Stack>}
        {movie && <>
          <Typography variant="overline" color="primary">Thảo luận sau suất chiếu</Typography>
          <Typography variant="h3" fontWeight={900}>{movie.title}</Typography>
          <Typography color="text.secondary" mt={1} mb={2}>
            Không gian dành cho khán giả đã xem phim và cộng đồng yêu điện ảnh.
          </Typography>
          <MovieCommunity movieId={movie.id} />
        </>}
      </Container>
    </Box>
  );
}
