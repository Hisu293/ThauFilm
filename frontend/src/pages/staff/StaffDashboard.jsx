import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import MovieFilterRoundedIcon from '@mui/icons-material/MovieFilterRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import { useAuth } from '../../context/AuthContext';
import { staffReportService } from '../../services/staffReportService';
import { staffAttendanceService } from '../../services/staffAttendanceService';
import refundService from '../../services/refundService';
import { connectRealtime } from '../../services/realtimeService';
import SearchBar from '../../components/ui/SearchBar';
import useStaffList from '../../hooks/useStaffList';

const DASHBOARD_DATE_FIELDS = ['time', 'checkedInAt', 'createdAt'];
const matchesCheckInSearch = (checkIn, query) =>
  [checkIn.id, checkIn.customer, checkIn.movie, checkIn.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('vi-VN');
};

const attendanceMeta = {
  WORKING: { label: 'Đang trong ca', color: 'warning' },
  COMPLETED: { label: 'Đã hoàn tất ca', color: 'success' },
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => {
  const positive = trend === 'up';
  return <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', overflow: 'hidden', position: 'relative' }}>
    <Box sx={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 100% 0%, ${color}20, transparent 48%)`, pointerEvents: 'none' }} />
    <CardContent sx={{ p: 2.5, position: 'relative', '&:last-child': { pb: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Avatar sx={{ bgcolor: `${color}1f`, color, width: 46, height: 46 }}><Icon /></Avatar>
        {trendValue && <Chip
          size="small"
          icon={positive ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
          label={trendValue}
          color={positive ? 'success' : 'error'}
          variant="outlined"
          sx={{ fontWeight: 800 }}
        />}
      </Stack>
      <Typography variant="h4" fontWeight={900} sx={{ mt: 2, letterSpacing: '-0.03em' }}>{value}</Typography>
      <Typography fontWeight={750}>{title}</Typography>
      <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
    </CardContent>
  </Card>;
};

const QuickAction = ({ icon: Icon, title, description, onClick, accent = 'primary.main' }) => (
  <Button
    onClick={onClick}
    fullWidth
    sx={{ p: 1.5, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', borderRadius: 2.5, border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: accent, bgcolor: 'action.hover' } }}
  >
    <Avatar sx={{ width: 40, height: 40, mr: 1.5, bgcolor: 'action.hover', color: accent }}><Icon fontSize="small" /></Avatar>
    <Box flex={1} minWidth={0}>
      <Typography fontWeight={800} variant="body2">{title}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap>{description}</Typography>
    </Box>
    <ArrowForwardRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
  </Button>
);

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [todayShift, setTodayShift] = useState(null);
  const [isShiftLeader, setIsShiftLeader] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [stats, today, shift, access] = await Promise.all([
        staffReportService.dashboard(),
        staffAttendanceService.today().catch(() => null),
        staffAttendanceService.todayShift().catch(() => null),
        refundService.staffAccess().catch(() => null),
      ]);
      setDashboardStats(stats);
      setAttendance(today);
      setTodayShift(shift);
      const leader = Boolean(access?.shiftLeader);
      setIsShiftLeader(leader);
      if (leader) {
        const requests = await refundService.staffList().catch(() => []);
        setPendingRefunds(requests.filter((item) => item.status === 'REQUESTED').length);
      } else {
        setPendingRefunds(0);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải tổng quan nhân viên.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const disconnect = connectRealtime({
      onEvent: (event) => {
        if (event?.type === 'NOTIFICATION' && event?.data?.notificationType === 'REFUND_REQUEST') loadDashboard(true);
      },
    });
    const handleFocus = () => loadDashboard(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDashboard]);

  const recentCheckIns = dashboardStats?.recentCheckIns || [];
  const { search, handleSearchChange, filteredItems: filteredCheckIns } = useStaffList({
    items: recentCheckIns,
    matchesSearch: matchesCheckInSearch,
    dateFields: DASHBOARD_DATE_FIELDS,
    rowsPerPage: 5,
  });
  const attendanceStatus = attendanceMeta[attendance?.status] || { label: 'Chưa bắt đầu ca', color: 'default' };
  const firstName = useMemo(() => {
    const name = user?.name || user?.fullName || 'nhân viên';
    return name.trim().split(/\s+/).pop();
  }, [user]);

  const kpis = [
    {
      title: 'Doanh thu hôm nay',
      value: money(dashboardStats?.todayRevenue),
      subtitle: 'Từ các booking đã thanh toán',
      icon: PaymentsRoundedIcon,
      color: '#22c55e',
      trend: dashboardStats?.revenueTrend,
      trendValue: dashboardStats?.revenueTrendValue,
    },
    {
      title: 'Vé bán hôm nay',
      value: Number(dashboardStats?.totalTicketsSold || 0).toLocaleString('vi-VN'),
      subtitle: 'Booking được xác nhận trong ngày',
      icon: ConfirmationNumberRoundedIcon,
      color: '#e50914',
      trend: dashboardStats?.ticketsTrend,
      trendValue: dashboardStats?.ticketsTrendValue,
    },
    {
      title: 'Tổng vé đã check-in',
      value: Number(dashboardStats?.checkedInTickets || 0).toLocaleString('vi-VN'),
      subtitle: 'Lượt khách đã được xác thực',
      icon: VerifiedRoundedIcon,
      color: '#38bdf8',
    },
    {
      title: 'Suất đang chiếu',
      value: Number(dashboardStats?.activeScreenings || 0).toLocaleString('vi-VN'),
      subtitle: 'Suất chiếu đang hoạt động',
      icon: MovieFilterRoundedIcon,
      color: '#f59e0b',
    },
  ];

  const quickActions = [
    { title: 'Quản lý vé', description: 'Kiểm tra và xác nhận vé', icon: QrCodeScannerRoundedIcon, path: '/staff/tickets' },
    { title: 'Lịch suất chiếu', description: 'Theo dõi lịch chiếu hôm nay', icon: ScheduleRoundedIcon, path: '/staff/showtimes-manage' },
    { title: 'Quản lý đơn hàng', description: 'Tra cứu booking và thanh toán', icon: ReceiptLongRoundedIcon, path: '/staff/bookings' },
    { title: 'Báo cáo vận hành', description: 'Xem doanh thu và hiệu suất', icon: AssessmentRoundedIcon, path: '/staff/reports' },
  ];

  if (loading) return <Box minHeight={500} display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  if (error && !dashboardStats) return <Alert severity="error" action={<Button onClick={() => loadDashboard()}>Thử lại</Button>}>{error}</Alert>;

  return <Stack spacing={3}>
    <Card sx={{ borderRadius: 4, overflow: 'hidden', position: 'relative', boxShadow: 'none' }}>
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 12% 5%, rgba(229,9,20,.28), transparent 38%), radial-gradient(circle at 92% 85%, rgba(99,102,241,.2), transparent 36%)' }} />
      <CardContent sx={{ position: 'relative', p: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}>
          <Box>
            <Chip size="small" label="TRUNG TÂM VẬN HÀNH" color="primary" sx={{ mb: 1.5, fontWeight: 850, letterSpacing: '.06em' }} />
            <Typography variant="h3" fontWeight={950} sx={{ fontSize: { xs: '2rem', md: '2.65rem' }, letterSpacing: '-.04em' }}>
              Chào {firstName}, sẵn sàng cho ca hôm nay?
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · Theo dõi nhanh hoạt động rạp theo thời gian thực.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={17} /> : <RefreshRoundedIcon />}
            disabled={refreshing}
            onClick={() => loadDashboard(true)}
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
          >
            Cập nhật dữ liệu
          </Button>
        </Stack>
      </CardContent>
    </Card>

    {error && <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>}

    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }} gap={2}>
      {kpis.map((item) => <KpiCard key={item.title} {...item} />)}
    </Box>

    <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(300px, .8fr)' }} gap={3}>
      <Card sx={{ borderRadius: 3, boxShadow: 'none' }}>
        <CardContent sx={{ p: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ px: 2.5, py: 2.25 }}>
            <Box>
              <Typography variant="h6" fontWeight={850}>Check-in gần đây</Typography>
              <Typography variant="body2" color="text.secondary">Các lượt khách vừa được xác thực tại rạp.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Box sx={{ width: { xs: '100%', md: 280 } }}>
                <SearchBar placeholder="Tìm mã vé, khách hàng hoặc phim…" value={search} onChange={handleSearchChange} />
              </Box>
              <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/staff/tickets')} sx={{ whiteSpace: 'nowrap' }}>Xem vé</Button>
            </Stack>
          </Stack>
          <Divider />
          <TableContainer>
            <Table sx={{ minWidth: 660 }}>
              <TableHead><TableRow><TableCell>Mã vé</TableCell><TableCell>Khách hàng</TableCell><TableCell>Phim</TableCell><TableCell>Thời gian</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead>
              <TableBody>
                {filteredCheckIns.map((row) => <TableRow key={row.id} hover>
                  <TableCell><Typography fontFamily="monospace" fontWeight={800}>{row.id}</Typography></TableCell>
                  <TableCell><Typography fontWeight={700}>{row.customer}</Typography></TableCell>
                  <TableCell>{row.movie}</TableCell>
                  <TableCell>{dateTime(row.time)}</TableCell>
                  <TableCell><Chip size="small" icon={<VerifiedRoundedIcon />} label="Đã check-in" color="success" variant="outlined" /></TableCell>
                </TableRow>)}
                {!filteredCheckIns.length && <TableRow><TableCell colSpan={5}>
                  <Stack alignItems="center" spacing={1} py={7}>
                    <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary' }}><VerifiedRoundedIcon /></Avatar>
                    <Typography fontWeight={750}>{recentCheckIns.length ? 'Không tìm thấy lượt check-in phù hợp' : 'Chưa có lượt check-in nào'}</Typography>
                    <Typography variant="body2" color="text.secondary">{recentCheckIns.length ? 'Thử tìm bằng mã vé, tên khách hàng hoặc tên phim.' : 'Dữ liệu check-in mới sẽ xuất hiện tại đây.'}</Typography>
                  </Stack>
                </TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Stack spacing={2.5}>
        <Card sx={{ borderRadius: 3, boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box><Typography variant="overline" color="text.secondary">CA LÀM HÔM NAY</Typography><Typography variant="h6" fontWeight={850}>{todayShift?.shiftName || 'Chưa được phân ca'}</Typography></Box>
              <Avatar sx={{ bgcolor: 'rgba(56,189,248,.12)', color: 'info.main' }}><AccessTimeRoundedIcon /></Avatar>
            </Stack>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>{todayShift?.shiftTime || 'Lịch ca chưa được cập nhật'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip label={attendanceStatus.label} color={attendanceStatus.color} sx={{ fontWeight: 750 }} />
              <Button size="small" onClick={() => navigate('/staff/attendance')}>Chấm công</Button>
            </Stack>
          </CardContent>
        </Card>

        {isShiftLeader && <Card sx={{ borderRadius: 3, boxShadow: 'none', borderColor: pendingRefunds ? 'warning.main' : 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(245,158,11,.12)', color: 'warning.main' }}><CurrencyExchangeRoundedIcon /></Avatar>
              <Box flex={1}><Typography fontWeight={850}>Hoàn tiền cần xử lý</Typography><Typography variant="body2" color="text.secondary">{pendingRefunds} yêu cầu mới đang chờ kiểm tra</Typography></Box>
            </Stack>
            <Button fullWidth variant={pendingRefunds ? 'contained' : 'outlined'} color={pendingRefunds ? 'warning' : 'primary'} sx={{ mt: 2 }} onClick={() => navigate('/staff/refunds')}>Mở danh sách hoàn tiền</Button>
          </CardContent>
        </Card>}
      </Stack>
    </Box>

    <Box>
      <Typography variant="h5" fontWeight={900}>Thao tác nhanh</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, mb: 2 }}>Đi nhanh đến các nghiệp vụ được sử dụng thường xuyên.</Typography>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }} gap={1.5}>
        {quickActions.map((action) => <QuickAction key={action.path} {...action} onClick={() => navigate(action.path)} />)}
      </Box>
    </Box>
  </Stack>;
};

export default StaffDashboard;
