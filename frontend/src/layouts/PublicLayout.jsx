import { useEffect } from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNavbar from '../components/layout/SiteNavbar';
import SiteFooter from '../components/layout/SiteFooter';
import ThauAiAssistantWidget from '../components/chatbot/ThauAiAssistantWidget';

// Cuộn lên đầu trang mỗi khi đổi route (vd: bấm link ở footer)
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

const PublicLayout = () => {
  const { pathname } = useLocation();

  return (
    <>
      <ScrollToTop />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'radial-gradient(circle at 15% 8%, rgba(251, 191, 36, 0.10) 0%, rgba(251, 191, 36, 0) 34%), radial-gradient(circle at 85% 12%, rgba(229, 9, 20, 0.08) 0%, rgba(229, 9, 20, 0) 30%), #0B1020',
        }}
      >
        <SiteNavbar />
        <Box component="main" sx={{ flex: 1, pt: pathname === '/' ? 0 : '72px' }}>
          <Outlet />
        </Box>
        <SiteFooter />
        <ThauAiAssistantWidget />
      </Box>
    </>
  );
};

export default PublicLayout;
