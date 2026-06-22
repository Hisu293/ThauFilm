import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useAuth } from '../context/AuthContext';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const AVATAR_COLORS = [
  '#e50914', '#9c27b0', '#1565c0', '#00695c',
  '#e65100', '#558b2f', '#6a1b9a', '#c62828',
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const UserMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  const handleOpen = (e) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const goTo = (path) => {
    handleClose();
    navigate(path);
  };

  if (!user) return null;

  const initials = getInitials(user.name);
  const bgColor = getAvatarColor(user.name);

  return (
    <>
      <Tooltip title="Tài khoản của bạn" arrow>
        <IconButton
          id="user-menu-btn"
          onClick={handleOpen}
          sx={{
            p: 0,
            border: '2px solid',
            borderColor: anchor ? '#e50914' : 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: '#e50914' },
          }}
        >
          {user.avatar ? (
            <Avatar src={user.avatar} alt={user.name} sx={{ width: 38, height: 38 }} />
          ) : (
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: bgColor,
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
          )}
        </IconButton>
      </Tooltip>

      <Menu
        id="user-dropdown"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 1.5,
              minWidth: 240,
              borderRadius: '14px',
              background: 'rgba(20,20,20,0.97)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(16px)',
              color: '#fff',
              overflow: 'visible',
              '&::before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 16,
                width: 10,
                height: 10,
                bgcolor: 'rgba(20,20,20,0.97)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderBottom: 'none',
                borderRight: 'none',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          },
        }}
      >
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {user.avatar ? (
              <Avatar src={user.avatar} alt={user.name} sx={{ width: 46, height: 46 }} />
            ) : (
              <Avatar
                sx={{
                  width: 46,
                  height: 46,
                  bgcolor: bgColor,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.55)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>

          {user.role === 'admin' && (
            <Chip
              label="Admin"
              size="small"
              color="primary"
              sx={{ mt: 1.5, fontWeight: 700, borderRadius: '6px', fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mb: 0.5 }} />

        <MenuItem
          id="menu-profile"
          onClick={() => goTo('/profile?tab=info')}
          sx={{ px: 2.5, py: 1.2, gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 0 }}>
            <AccountCircleRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>
            Hồ sơ của tôi
          </Typography>
        </MenuItem>

        <MenuItem
          id="menu-tickets"
          onClick={() => goTo('/profile?tab=history')}
          sx={{ px: 2.5, py: 1.2, gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 0 }}>
            <ConfirmationNumberRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>
            Vé của tôi
          </Typography>
        </MenuItem>

        <MenuItem
          id="menu-saved"
          onClick={() => goTo('/favorite-lists')}
          sx={{ px: 2.5, py: 1.2, gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 0 }}>
            <BookmarkRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>
            Phim đã lưu
          </Typography>
        </MenuItem>

        <MenuItem
          id="menu-community"
          onClick={() => goTo('/community/connections')}
          sx={{ px: 2.5, py: 1.2, gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 0 }}>
            <GroupsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>
            Kết nối cộng đồng
          </Typography>
        </MenuItem>

        <MenuItem
          id="menu-settings"
          onClick={() => goTo('/profile?tab=settings')}
          sx={{ px: 2.5, py: 1.2, gap: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 0 }}>
            <SettingsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.88)' }}>
            Cài đặt
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export const AuthButtons = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (isLoggedIn) {
    return (
      <Button
        id="nav-logout"
        variant="outlined"
        color="inherit"
        startIcon={<LogoutRoundedIcon />}
        onClick={handleLogout}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderColor: 'rgba(255,255,255,0.3)',
          borderRadius: '8px',
          '&:hover': { borderColor: '#e50914', color: '#e50914', backgroundColor: 'rgba(229,9,20,0.08)' },
          transition: 'all 0.2s',
        }}
      >
        Đăng xuất
      </Button>
    );
  }

  return (
    <Button
      id="nav-login"
      variant="outlined"
      color="inherit"
      onClick={() => navigate('/login')}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: '8px',
        '&:hover': { borderColor: '#e50914', color: '#e50914' },
        transition: 'all 0.2s',
      }}
    >
      Đăng nhập
    </Button>
  );
};

/** @deprecated Dùng AuthButtons — tự đổi theo trạng thái đăng nhập */
export const LogoutButton = AuthButtons;

export default UserMenu;
