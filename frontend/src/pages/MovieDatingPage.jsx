import { Box, Container, IconButton, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import MovieMatchingPanel from '../components/MovieMatchingPanel';

export default function MovieDatingPage() {
  const navigate = useNavigate();
  return <Box sx={{ minHeight: '84vh', py: { xs: 1.5, md: 4 }, background: 'radial-gradient(circle at 12% 4%, rgba(232,62,111,.1), transparent 28%), radial-gradient(circle at 88% 10%, rgba(245,166,130,.12), transparent 25%), #fbf6f8' }}>
    <Container maxWidth="md">
      <Paper elevation={0} sx={{ mb: 2.5, px: { xs: 1, sm: 2 }, py: 1.4, borderRadius: 4, bgcolor: 'rgba(255,250,251,.94)', border: '1px solid #efdee4', boxShadow: '0 10px 32px rgba(91,42,60,.08)', backdropFilter: 'blur(12px)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#17151b' }}><ArrowBackIosNewRoundedIcon /></IconButton>
          <Stack direction="row" spacing={1.1} alignItems="center"><Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, #f15b82, #d92f62)', boxShadow: '0 6px 16px rgba(232,62,111,.24)' }}><FavoriteRoundedIcon sx={{ color: '#fff', fontSize: 21 }} /></Box><Typography variant="h5" fontWeight={1000} color="#25191e">Hẹn hò xem phim</Typography></Stack>
          <IconButton sx={{ color: '#5c424c', border: '1px solid #efdce3', bgcolor: '#fff5f7' }}><MoreHorizRoundedIcon /></IconButton>
        </Stack>
      </Paper>
      <MovieMatchingPanel />
    </Container>
  </Box>;
}
