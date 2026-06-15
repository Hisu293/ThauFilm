import { useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNavbar from '../components/layout/SiteNavbar';
import SiteFooter from '../components/layout/SiteFooter';
import { bookingTheme } from '../theme/theme';

// Cuộn lên đầu trang mỗi khi đổi route (vd: bấm link ở footer)
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

const PublicLayout = () => (
  <ThemeProvider theme={bookingTheme}>
    <CssBaseline />
    <ScrollToTop />
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 15% 10%, rgba(251, 191, 36, 0.06) 0%, rgba(0, 0, 0, 0) 40%), #0F172A',
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
