import { Box, Container, IconButton, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import MovieMatchingPanel from '../components/MovieMatchingPanel';

export default function MovieDatingPage() {
  const navigate = useNavigate();
  return <Box sx={{ minHeight: '84vh', py: { xs: 1.5, md: 4 }, bgcolor: '#f4f5f7' }}>
    <Container maxWidth="md">
      <Paper elevation={0} sx={{ mb: 2.5, px: { xs: 1, sm: 2 }, py: 1.4, borderRadius: 4, bgcolor: '#fff', border: '1px solid #ececef' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#17151b' }}><ArrowBackIosNewRoundedIcon /></IconButton>
          <Stack direction="row" spacing={1} alignItems="center"><FavoriteRoundedIcon sx={{ color: '#6f45db' }} /><Box textAlign="center"><Typography variant="h5" fontWeight={1000} color="#111">Hẹn hò xem phim</Typography><Typography variant="caption" color="#77737e">Thấu Film Dating</Typography></Box></Stack>
          <IconButton sx={{ color: '#17151b', border: '1px solid #e7e5ea' }}><MoreHorizRoundedIcon /></IconButton>
        </Stack>
      </Paper>
      <MovieMatchingPanel />
    </Container>
  </Box>;
}
