import { Box, Container } from '@mui/material';
import MovieMatchingPanel from '../components/MovieMatchingPanel';

export default function MovieDatingPage() {
  return <Box sx={{ minHeight: '84vh', py: { xs: 2, md: 3 }, background: 'radial-gradient(circle at 15% 0%, rgba(251,191,36,.08), transparent 30%), radial-gradient(circle at 90% 8%, rgba(229,9,20,.06), transparent 26%), #0B1020' }}>
    <Container maxWidth="lg">
      <MovieMatchingPanel />
    </Container>
  </Box>;
}
