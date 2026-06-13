import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { ADMIN_VIEWS, VIEW_META } from '../admin/adminNav';
import { adminTheme, SIDEBAR_WIDTH } from '../admin/adminTheme';
import AdminSidebar from '../admin/components/AdminSidebar';
import AdminContent from '../admin/AdminContent';
import { useAdminStore } from '../admin/useAdminStore';
import './AdminPage.css';

const AdminPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState(ADMIN_VIEWS.DASHBOARD);
  const store = useAdminStore();
  const meta = VIEW_META[activeView] || VIEW_META[ADMIN_VIEWS.DASHBOARD];
  const me = store.me;
  const adminInitials = (me?.fullName || me?.email || 'AD').charAt(0).toUpperCase();

  const handleViewChange = (view) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  const sidebar = (
    <AdminSidebar
      activeView={activeView}
      onViewChange={handleViewChange}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box className="admin-shell">
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
              background: '#0c0c10',
              borderRight: '1px solid rgba(255,255,255,0.08)',
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
              background: 'rgba(8, 8, 12, 0.85)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Toolbar sx={{ gap: 2, py: 1 }}>
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ color: '#fff', display: { md: 'none' } }}
                aria-label="Mở menu"
              >
                <MenuRoundedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                  {meta.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }} noWrap>
                  {meta.subtitle}
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Tìm trong panel..."
                className="admin-search"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  maxWidth: 240,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 3,
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <NotificationsNoneRoundedIcon />
              </IconButton>
              {me && (
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {me.fullName || me.email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }} noWrap>
                    {me.role}
                  </Typography>
                </Box>
              )}
              <Avatar
                src={me?.avatarUrl || undefined}
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #e50914, #7c3aed)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {adminInitials}
              </Avatar>
            </Toolbar>
          </AppBar>

          <Box className="admin-main-inner">
            <AdminContent view={activeView} store={store} />
            <Typography
              variant="caption"
              sx={{ display: 'block', textAlign: 'center', mt: 4, color: 'rgba(255,255,255,0.22)' }}
            >
              Demo UI · Kết nối API backend để đồng bộ dữ liệu thực
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminPage;
