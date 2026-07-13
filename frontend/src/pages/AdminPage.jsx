import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { ADMIN_VIEWS, VIEW_META } from '../admin/adminNav';
import { adminTheme, SIDEBAR_WIDTH } from '../admin/adminTheme';
import AdminSidebar from '../admin/components/AdminSidebar';
import AdminContent from '../admin/AdminContent';
import { useAdminStore } from '../admin/useAdminStore';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

const AdminPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState(ADMIN_VIEWS.DASHBOARD);
  const [mode, setMode] = useState('dark');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const store = useAdminStore();

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  // Dựng theme động sáng/tối trên nền adminTheme (cinemaTheme), giống StaffLayout.
  const theme = useMemo(
    () =>
      createTheme(adminTheme, {
        palette: {
          mode,
          primary: { main: '#e50914' },
          ...(mode === 'dark'
            ? {
                background: { default: '#08080c', paper: '#121218' },
                text: { primary: '#fafafa', secondary: 'rgba(255,255,255,0.58)' },
                divider: 'rgba(255,255,255,0.08)',
              }
            : {
                background: { default: '#f4f4f5', paper: '#ffffff' },
                text: { primary: '#111827', secondary: '#6b7280' },
                divider: 'rgba(0,0,0,0.08)',
              }),
        },
      }),
    [mode],
  );
  const isDark = mode === 'dark';
  const meta = VIEW_META[activeView] || VIEW_META[ADMIN_VIEWS.DASHBOARD];

  const handleViewChange = (view) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <AdminSidebar
      activeView={activeView}
      onViewChange={handleViewChange}
      onNavigate={() => setMobileOpen(false)}
      onLogout={handleLogout}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="admin-shell" data-mode={mode}>
        {/* Desktop: sidebar cố định bên trái (không dùng Drawer permanent — tránh lỗi ẩn trên MUI 7) */}
        <Box
          component="aside"
          className="admin-sidebar-panel"
          aria-label="Admin navigation"
          sx={{ display: { xs: 'none', md: 'flex' } }}
        >
          {sidebar}
        </Box>

        {/* Mobile: drawer trượt */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              background: isDark ? '#0c0c10' : '#ffffff',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {sidebar}
        </Drawer>

        <Box component="main" className="admin-main">
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              background: isDark ? 'rgba(8, 8, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${theme.palette.divider}`,
              color: 'text.primary',
            }}
          >
            <Toolbar sx={{ gap: 2, py: 1 }}>
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ color: 'text.primary', display: { md: 'none' } }}
                aria-label="Mở menu"
              >
                <MenuRoundedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                  {meta.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                  {meta.subtitle}
                </Typography>
              </Box>
              <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }} aria-label="Đổi giao diện sáng/tối">
                {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
              <IconButton sx={{ color: 'text.secondary' }}>
                <NotificationsNoneRoundedIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box className="admin-main-inner">
            <AdminContent view={activeView} store={store} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminPage;
