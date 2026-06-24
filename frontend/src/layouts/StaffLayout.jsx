import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Breadcrumbs,
  Link,
  Stack,
  Button
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useAuth } from '../context/AuthContext';
import cinemaTheme from '../theme/cinemaTheme';

const drawerWidth = 280;

const menuItems = [
  { text: 'Tổng quan', icon: <DashboardRoundedIcon />, path: '/staff/dashboard' },
  { text: 'Quản lý phim', icon: <LocalMoviesRoundedIcon />, path: '/staff/movies' },
  { text: 'Quản lý suất chiếu', icon: <ScheduleRoundedIcon />, path: '/staff/showtimes-manage' },
  { text: 'Quản lý vé', icon: <ConfirmationNumberRoundedIcon />, path: '/staff/tickets' },
  { text: 'Quản lý đơn hàng', icon: <ReceiptLongRoundedIcon />, path: '/staff/bookings' },
  { text: 'Quản lý khách hàng', icon: <PeopleAltRoundedIcon />, path: '/staff/customers' },
  { text: 'Quản lý khuyến mãi', icon: <LocalOfferRoundedIcon />, path: '/staff/promotions' },
  { text: 'Báo cáo', icon: <AssessmentRoundedIcon />, path: '/staff/reports' },
];

const StaffLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState('dark');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const userName = user?.fullName || user?.name || user?.email || 'Staff';
  const userInitial = userName.charAt(0).toUpperCase();

  const [anchorEl, setAnchorEl] = useState(null);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme(cinemaTheme, {
        palette: {
          mode,
          primary: { main: '#e50914' },
          ...(mode === 'dark'
            ? {
                background: { default: '#08080c', paper: '#121218' },
                text: { primary: '#fafafa', secondary: 'rgba(255,255,255,0.58)' },
                divider: 'rgba(255,255,255,0.08)'
              }
            : {
                background: { default: '#f4f4f5', paper: '#ffffff' },
                text: { primary: '#111827', secondary: '#6b7280' },
                divider: 'rgba(0,0,0,0.08)'
              }),
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: '"Be Vietnam Pro", "Inter", system-ui, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.02em' },
          h6: { fontWeight: 600 },
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: ({ theme }) => ({
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(145deg, rgba(24, 24, 30, 0.95), rgba(16, 16, 20, 0.98))'
                  : '#ffffff',
                border: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
        }
      }),
    [mode],
  );

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  // Find current menu item for breadcrumbs
  const currentItem = menuItems.find(item => location.pathname.startsWith(item.path)) || menuItems[0];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 2.5, flexShrink: 0 }}>
        <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }} noWrap>
            ThauFilm Staff
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Bảng điều khiển nhân viên
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
        <List dense disablePadding>
          {menuItems.map((item) => {
            const isSelected = location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.text}
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1,
                  color: isSelected ? 'primary.main' : 'text.secondary',
                  ...(isSelected && {
                    bgcolor: mode === 'dark' ? 'rgba(229, 9, 20, 0.08)' : 'rgba(229, 9, 20, 0.05)',
                    borderLeft: '3px solid #e50914',
                  }),
                  '&:hover': { 
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: isSelected ? 'primary.main' : 'text.primary'
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: isSelected ? 'primary.main' : 'text.secondary', 
                  minWidth: 36 
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontSize: '0.875rem', 
                    fontWeight: isSelected ? 700 : 500 
                  }} 
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2, flexShrink: 0, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackRoundedIcon />}
          fullWidth
          variant="outlined"
          size="small"
          onClick={() => isMobile && setMobileOpen(false)}
          sx={{
            borderColor: theme.palette.divider,
            color: 'text.secondary',
            fontSize: '0.8rem',
            '&:hover': { borderColor: '#e50914', bgcolor: 'rgba(229,9,20,0.08)', color: 'primary.main' },
          }}
        >
          Về trang chủ
        </Button>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Sidebar */}
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'flex' },
            width: drawerWidth,
            flexShrink: 0,
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            zIndex: 1200
          }}
        >
          {drawer}
        </Box>

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: { md: `${drawerWidth}px` },
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
          }}
        >
          {/* Topbar */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              background: mode === 'dark' ? 'rgba(8, 8, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${theme.palette.divider}`,
              color: 'text.primary'
            }}
          >
            <Toolbar sx={{ gap: 2, py: 1 }}>
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1, display: { md: 'none' } }}
              >
                <MenuRoundedIcon />
              </IconButton>
              
              <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
                  <Link component={RouterLink} to="/staff/dashboard" underline="hover" color="text.secondary">
                    Nhân viên
                  </Link>
                  <Typography color="text.primary" fontWeight="medium">
                    {currentItem.text}
                  </Typography>
                </Breadcrumbs>
              </Box>

              <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
                {mode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
              
              <IconButton sx={{ color: 'text.secondary' }}>
                <NotificationsNoneRoundedIcon />
              </IconButton>
              
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', minWidth: 0, ml: 1 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {userName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                  Nhân viên
                </Typography>
              </Box>
              
              <IconButton onClick={handleMenuClick} size="small" sx={{ p: 0, ml: 1 }}>
                <Avatar 
                  src={user?.avatar || undefined}
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    background: 'linear-gradient(135deg, #e50914, #7c3aed)',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  {userInitial}
                </Avatar>
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    mt: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                    boxShadow: mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleMenuClose}>
                  <AccountCircleRoundedIcon sx={{ mr: 2, color: 'text.secondary' }} /> Hồ sơ
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <LogoutRoundedIcon sx={{ mr: 2, color: 'inherit' }} /> Đăng xuất
                </MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          {/* Page Content */}
          <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flexGrow: 1, maxWidth: 1400, mx: 'auto', width: '100%' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default StaffLayout;
