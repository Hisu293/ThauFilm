import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardActionArea, CardContent, CardMedia, CircularProgress, Container, Grid, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { socialService } from '../services/socialService';

export default function SharedFavoriteListPage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    socialService.getPublicFavoriteList(listId)
      .then((result) => { if (active) setList(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [listId]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, minHeight: '70vh' }}>
      {error && <Alert severity="error">Danh sách không tồn tại hoặc đang ở chế độ riêng tư.</Alert>}
      {!list && !error && <Box textAlign="center" py={10}><CircularProgress /></Box>}
      {list && <>
        <Typography variant="overline" color="primary">Danh sách phim được chia sẻ</Typography>
        <Typography variant="h3" fontWeight={900} mb={1}>{list.name}</Typography>
        <Typography color="text.secondary" mb={4}>Tạo bởi {list.userFullName || 'một thành viên'} • {list.movieCount} phim</Typography>
        {list.movies?.length === 0 && <Alert severity="info">Danh sách này chưa có phim.</Alert>}
        <Grid container spacing={3}>{list.movies?.map((movie) => <Grid key={movie.id} size={{ xs: 6, sm: 4, md: 3 }}><Card><CardActionArea onClick={() => navigate(`/movies/${movie.id}`)}><CardMedia component="img" image={movie.posterUrl || '/placeholder.svg'} alt={movie.title} sx={{ aspectRatio: '2/3', objectFit: 'cover' }} /><CardContent><Typography fontWeight={800} noWrap>{movie.title}</Typography></CardContent></CardActionArea></Card></Grid>)}</Grid>
      </>}
    </Container>
  );
}
