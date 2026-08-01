import { Box, Container, Stack, Typography } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import MovieMatchingPanel from '../components/MovieMatchingPanel';
import { useColorMode } from '../context/ColorModeContext';

export default function MovieDatingPage() {
  const { isDark } = useColorMode();

  return (
    <Box
      component="main"
      sx={{
        minHeight: 'calc(100vh - 72px)',
        py: { xs: 3, md: 5 },
        color: isDark ? '#f8fafc' : '#172033',
        background: isDark ? `
          radial-gradient(circle at 12% 6%, rgba(229,9,20,.13), transparent 28%),
          radial-gradient(circle at 88% 12%, rgba(245,181,27,.09), transparent 26%),
          linear-gradient(145deg, #08090d 0%, #0b1020 55%, #100b18 100%)
        ` : `
          radial-gradient(circle at 12% 6%, rgba(229,9,20,.055), transparent 28%),
          radial-gradient(circle at 88% 12%, rgba(245,181,27,.09), transparent 26%),
          linear-gradient(145deg, #fffdf9 0%, #f7f8fb 55%, #fff8fa 100%)
        `,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 3, md: 4 } }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.8}>
              <LocalMoviesRoundedIcon sx={{ color: '#f5b51b', fontSize: 18 }} />
              <Typography sx={{ color: '#f5b51b', fontWeight: 900, fontSize: 12, letterSpacing: '.14em' }}>
                CỘNG ĐỒNG YÊU ĐIỆN ẢNH
              </Typography>
            </Stack>
            <Typography component="h1" sx={{ fontSize: { xs: 30, md: 42 }, lineHeight: 1.08, fontWeight: 950, letterSpacing: '-.035em' }}>
              Tìm người cùng gu phim
            </Typography>
            <Typography sx={{ mt: 1, color: isDark ? 'rgba(226,232,240,.62)' : 'text.secondary', maxWidth: 620 }}>
              Một bộ phim hay sẽ vui hơn khi có người phù hợp ngồi cạnh.
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'grid' }, placeItems: 'center', width: 58, height: 58, borderRadius: '20px', color: '#111827', background: 'linear-gradient(145deg,#ffd76a,#f5a800)', boxShadow: '0 14px 34px rgba(245,181,27,.2)', transform: 'rotate(6deg)' }}>
            <FavoriteRoundedIcon />
          </Box>
        </Stack>
        <MovieMatchingPanel />
      </Container>
    </Box>
  );
}
