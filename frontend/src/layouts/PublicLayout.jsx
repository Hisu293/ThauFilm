import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SiteNavbar from '../components/layout/SiteNavbar';
import SiteFooter from '../components/layout/SiteFooter';
import { cinemaTheme } from '../theme/cinemaTheme';

const PublicLayout = () => (
  <ThemeProvider theme={cinemaTheme}>
    <CssBaseline />
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 15% 10%, rgba(229, 9, 20, 0.12) 0%, rgba(0, 0, 0, 0) 40%), #0b0b0b',
      }}
    >
      <SiteNavbar />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <SiteFooter />
    </Box>
  </ThemeProvider>
);

export default PublicLayout;
