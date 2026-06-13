import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import { adminService, isAdminAuth } from '../services/adminService';

/**
 * Cổng bảo vệ /admin: chỉ tài khoản admin mới vào được.
 * Gọi GET /api/admin/auth-check; nếu không phải admin → đá về trang chủ.
 */
const AdminRoute = ({ children }) => {
  const [status, setStatus] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    let active = true;
    adminService
      .authCheck()
      .then((data) => active && setStatus(isAdminAuth(data) ? 'allowed' : 'denied'))
      .catch(() => active && setStatus('denied'));
    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <Box sx={centerSx}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Đang kiểm tra quyền truy cập…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (status === 'denied') {
    return (
      <Box sx={centerSx}>
        <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', px: 3 }}>
          <BlockRoundedIcon sx={{ fontSize: 56, color: '#ef4444' }} />
          <Typography variant="h6" fontWeight={700}>
            Không có quyền truy cập
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.6, maxWidth: 360 }}>
            Khu vực quản trị chỉ dành cho tài khoản admin. Vui lòng đăng nhập bằng tài khoản admin.
          </Typography>
          <Button variant="contained" href="/" sx={{ fontWeight: 600 }}>
            Về trang chủ
          </Button>
        </Stack>
      </Box>
    );
  }

  return children;
};

const centerSx = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: '#0a0a0f',
  color: '#fff',
};

export default AdminRoute;
