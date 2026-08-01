import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import SectionHeader from '../components/SectionHeader';
import SectionState from '../components/SectionState';
import StatusChip from '../components/StatusChip';
import { USER_ROLES } from '../../services/adminService';

const thSx = { color: 'text.secondary', fontWeight: 600 };

/** Tài khoản đang bật hay không (DTO có thể không trả `enabled` → mặc định bật). */
const isEnabled = (u) => u.enabled !== false;
const displayName = (u) => u.fullName || u.email || 'Người dùng';

/** Avatar người dùng: dùng ảnh nếu có, không thì lấy chữ cái đầu. */
const UserAvatar = ({ user, size = 36 }) => (
  <Avatar
    src={user.avatarUrl || undefined}
    sx={{ width: size, height: size, fontSize: size * 0.4, bgcolor: isEnabled(user) ? 'rgba(229,9,20,0.3)' : 'rgba(239,68,68,0.3)' }}
  >
    {displayName(user).charAt(0).toUpperCase()}
  </Avatar>
);

/** Một dòng thông tin trong dialog chi tiết. */
const InfoRow = ({ icon: Icon, label, value }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Icon fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  </Stack>
);

/** Dialog xem chi tiết người dùng (dữ liệu từ GET /api/admin/users/{userId}). */
const UserDetailDialog = ({ open, loading, user, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>Thông tin người dùng</DialogTitle>
    <DialogContent>
      {loading || !user ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <UserAvatar user={user} size={56} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {displayName(user)}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                <StatusChip status={user.role} />
                <StatusChip status={isEnabled(user) ? 'enabled' : 'disabled'} />
              </Stack>
            </Box>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <InfoRow icon={EmailRoundedIcon} label="Email" value={user.email} />
          <InfoRow icon={PhoneRoundedIcon} label="Số điện thoại" value={user.phone} />
          <InfoRow icon={BadgeRoundedIcon} label="Vai trò" value={user.role} />
          <InfoRow icon={PublicRoundedIcon} label="Đăng nhập qua" value={user.provider} />
        </Stack>
      )}
    </DialogContent>
  </Dialog>
);

// ── Tài khoản người dùng ───────────────────────────────────────────────
export const UserAccountsSection = ({ crud }) => {
  const [busyId, setBusyId] = useState(null);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'enabled' | 'disabled'

  // Dialog chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(
    () =>
      crud.list.filter((u) => {
        const q = search.trim().toLowerCase();
        if (q && ![u.fullName, u.email, u.phone].some((v) => v?.toLowerCase().includes(q))) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter === 'enabled' && !isEnabled(u)) return false;
        if (statusFilter === 'disabled' && isEnabled(u)) return false;
        return true;
      }),
    [crud.list, search, roleFilter, statusFilter]
  );

  const hasFilter = search || roleFilter || statusFilter;
  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const toggleEnabled = async (u) => {
    setBusyId(u.id);
    try {
      if (isEnabled(u)) await crud.disable(u.id);
      else await crud.enable(u.id);
    } catch (err) {
      window.alert(err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setBusyId(null);
    }
  };

  // Xem chi tiết: gọi API GET /api/admin/users/{userId}
  const viewDetail = async (u) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailUser(null);
    try {
      const data = await crud.getById(u.id);
      setDetailUser(data || u);
    } catch (err) {
      window.alert(err.message || 'Không tải được thông tin người dùng');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <SectionHeader title="Quản lý tài khoản" subtitle="Xem chi tiết · Khóa / Mở khóa tài khoản" />

      {/* Bộ lọc người dùng */}
      <Box
        className="admin-panel admin-animate-in"
        sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}
      >
        <TextField
          size="small"
          placeholder="Tìm theo tên, email, SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" label="Vai trò" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Tất cả vai trò</MenuItem>
          {USER_ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="enabled">Đang hoạt động</MenuItem>
          <MenuItem value="disabled">Đã khóa</MenuItem>
        </TextField>
        {hasFilter && (
          <Button size="small" color="inherit" startIcon={<FilterAltOffRoundedIcon />} onClick={clearFilters}>
            Xóa lọc
          </Button>
        )}
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', ml: 'auto' }}>
          {filtered.length}/{crud.list.length} người dùng
        </Typography>
      </Box>

      <SectionState
        loading={crud.loading}
        error={crud.error}
        empty={!crud.loading && crud.list.length === 0}
        emptyText="Chưa có người dùng nào"
        onRetry={crud.reload}
      >
        <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Người dùng</TableCell>
                  <TableCell sx={thSx}>Số điện thoại</TableCell>
                  <TableCell sx={thSx}>Vai trò</TableCell>
                  <TableCell sx={thSx}>Trạng thái</TableCell>
                  <TableCell align="right" sx={thSx}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'rgba(255,255,255,0.4)' }}>
                      Không có người dùng khớp bộ lọc
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => {
                  const enabled = isEnabled(u);
                  return (
                    <TableRow key={u.id} className="admin-table-row">
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <UserAvatar user={u} />
                          <Box>
                            <Typography fontWeight={600}>{displayName(u)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {u.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.phone || '—'}</TableCell>
                      <TableCell>
                        <StatusChip status={u.role} />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={enabled ? 'enabled' : 'disabled'} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <IconButton size="small" onClick={() => viewDetail(u)} sx={{ color: 'rgba(255,255,255,0.6)' }} title="Xem chi tiết">
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                          <Button
                            size="small"
                            variant={enabled ? 'outlined' : 'contained'}
                            color={enabled ? 'warning' : 'success'}
                            startIcon={enabled ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
                            onClick={() => toggleEnabled(u)}
                            disabled={busyId === u.id}
                            sx={{ fontWeight: 600 }}
                          >
                            {enabled ? 'Khóa' : 'Mở khóa'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </SectionState>

      <UserDetailDialog open={detailOpen} loading={detailLoading} user={detailUser} onClose={() => setDetailOpen(false)} />
    </>
  );
};

const ROLE_INFO = {
  ADMIN: { desc: 'Toàn quyền hệ thống, cấu hình và báo cáo', color: '#e50914' },
  STAFF: { desc: 'Quầy vé, check-in, hỗ trợ khách tại rạp', color: '#6366f1' },
  MEMBER: { desc: 'Đặt vé, xem lịch sử, khuyến mãi cá nhân', color: '#94a3b8' },
};

// ── Phân quyền ─────────────────────────────────────────────────────────
export const UserRolesSection = ({ crud }) => {
  const [busyId, setBusyId] = useState(null);

  const changeRole = async (id, role) => {
    setBusyId(id);
    try {
      await crud.setRole(id, role);
    } catch (err) {
      window.alert(err.message || 'Đổi vai trò thất bại');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <SectionHeader title="Phân quyền" subtitle="Admin · Staff · Member" />
      <SectionState
        loading={crud.loading}
        error={crud.error}
        empty={!crud.loading && crud.list.length === 0}
        emptyText="Chưa có người dùng nào"
        onRetry={crud.reload}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {USER_ROLES.map((role) => (
            <Box key={role} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': ROLE_INFO[role].color }}>
              <StatusChip status={role} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {ROLE_INFO[role].desc}
              </Typography>
              <Typography variant="h4" sx={{ mt: 2, fontWeight: 800 }}>
                {crud.list.filter((u) => u.role === role).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                tài khoản
              </Typography>
            </Box>
          ))}
        </Box>
        <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2.5, pt: 2 }}>
            Gán vai trò nhanh
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Người dùng</TableCell>
                  <TableCell sx={thSx}>Vai trò hiện tại</TableCell>
                  <TableCell sx={thSx}>Đổi vai trò</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {crud.list.map((u) => (
                  <TableRow key={u.id} className="admin-table-row">
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <StatusChip status={u.role} />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={USER_ROLES.includes(u.role) ? u.role : ''}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        disabled={busyId === u.id}
                        sx={{ minWidth: 140 }}
                      >
                        {USER_ROLES.map((role) => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </SectionState>
    </>
  );
};
