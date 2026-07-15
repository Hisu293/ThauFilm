import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import SwipeRoundedIcon from '@mui/icons-material/SwipeRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import MovieMatchingPanel from '../components/MovieMatchingPanel';

export default function MovieDatingPage() {
  return <Box sx={{ minHeight: '82vh', py: { xs: 3, md: 6 }, background: 'radial-gradient(circle at 10% 10%, rgba(255,63,129,.12), transparent 28%), radial-gradient(circle at 90% 5%, rgba(123,92,255,.12), transparent 30%)' }}>
    <Container maxWidth="xl">
      <Stack alignItems="center" textAlign="center" spacing={1.5} mb={{ xs: 3, md: 5 }}>
        <Chip icon={<FavoriteRoundedIcon />} label="THẤU FILM DATING" color="secondary" variant="outlined" sx={{ fontWeight: 900, letterSpacing: 1 }} />
        <Typography variant="h2" fontWeight={1000} sx={{ fontSize: { xs: '2.35rem', md: '4rem' }, maxWidth: 900 }}>Tìm một người cùng gu,<br />bắt đầu bằng một bộ phim.</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 680, fontSize: { md: '1.08rem' } }}>Khám phá từng hồ sơ, vuốt để thể hiện cảm xúc và trò chuyện khi cả hai cùng thích nhau.</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center" pt={1}><Chip icon={<SwipeRoundedIcon />} label="Vuốt để khám phá" /><Chip icon={<LocalMoviesRoundedIcon />} label="Hẹn lịch xem phim" /><Chip icon={<FavoriteRoundedIcon />} label="Match hai chiều" /></Stack>
      </Stack>
      <MovieMatchingPanel />
    </Container>
  </Box>;
}
