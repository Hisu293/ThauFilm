import { useMemo } from 'react';
import {
  Avatar,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SectionState from '../components/SectionState';
import StatusChip from '../components/StatusChip';

const WEEKLY = [
  { day: 'T2', value: 62 },
  { day: 'T3', value: 78 },
  { day: 'T4', value: 55 },
  { day: 'T5', value: 91 },
  { day: 'T6', value: 100 },
  { day: 'T7', value: 88 },
  { day: 'CN', value: 72 },
];

const displayName = (u) => u.fullName || u.email || 'Người dùng';
const isEnabled = (u) => u.enabled !== false;

/** Thẻ số liệu. */
const StatCard = ({ icon: Icon, label, value, accent }) => (
  <Box className="admin-stat-card" sx={{ '--accent': accent, p: 2.5, borderRadius: 3 }}>
    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${accent}22`, color: accent }}>
      <Icon fontSize="small" />
    </Box>
    <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'rgba(255,255,255,0.5)' }}>
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>
      {value}
    </Typography>
  </Box>
);

const DashboardSection = ({ dashboard, users }) => {
  const max = useMemo(() => Math.max(...WEEKLY.map((d) => d.value)), []);
  const d = dashboard.data;

  const cards = d
    ? [
        { label: 'Tổng người dùng', value: d.totalUsers, icon: GroupRoundedIcon, accent: '#e50914' },
        { label: 'Đang hoạt động', value: d.enabledUsers, icon: VerifiedUserRoundedIcon, accent: '#22c55e' },
        { label: 'Đã khóa', value: d.disabledUsers, icon: LockRoundedIcon, accent: '#f59e0b' },
        { label: 'Quản trị viên', value: d.totalAdmins, icon: AdminPanelSettingsRoundedIcon, accent: '#6366f1' },
      ]
    : [];

  return (
    <Box>
      <SectionState loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.reload}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {cards.map((c) => (
            <StatCard key={c.label} {...c} value={c.value ?? 0} />
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 2, mb: 3 }}>
          <Box className="admin-panel" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Đặt vé theo tuần
            </Typography>
            <Stack direction="row" alignItems="flex-end" sx={{ height: 120, gap: 1 }}>
              {WEEKLY.map((w, i) => (
                <Stack key={w.day} alignItems="center" sx={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <Box className={`admin-chart-bar ${i === 4 ? '' : 'muted'}`} sx={{ width: '100%', maxWidth: 32, height: `${(w.value / max) * 100}%` }} />
                  <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.5 }}>
                    {w.day}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.35 }}>
              * Dữ liệu demo — chưa có API thống kê đặt vé
            </Typography>
          </Box>
          <Box className="admin-panel" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Phân bố vai trò
            </Typography>
            <Stack spacing={1.5}>
              <Row label="Quản trị viên (Admin)" value={d?.totalAdmins ?? 0} />
              <Row label="Nhân viên (Staff)" value={d?.totalStaff ?? 0} />
              <Row label="Thành viên (Member)" value={d?.totalMembers ?? 0} />
              <Row label="Tài khoản bị khóa" value={d?.disabledUsers ?? 0} />
            </Stack>
          </Box>
        </Box>
      </SectionState>

      <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2.5, pb: 0 }}>
          Người dùng gần đây
        </Typography>
        <SectionState
          loading={users.loading}
          error={users.error}
          empty={!users.loading && users.list.length === 0}
          emptyText="Chưa có người dùng"
          onRetry={users.reload}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Tên</TableCell>
                  <TableCell sx={thSx}>Vai trò</TableCell>
                  <TableCell sx={thSx}>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.list.slice(0, 5).map((u) => (
                  <TableRow key={u.id} className="admin-table-row">
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar src={u.avatarUrl || undefined} sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'rgba(229,9,20,0.35)' }}>
                          {displayName(u).charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {displayName(u)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={u.role} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={isEnabled(u) ? 'enabled' : 'disabled'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionState>
      </Box>
    </Box>
  );
};

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };

const Row = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography fontWeight={700}>{value}</Typography>
  </Stack>
);

export default DashboardSection;
