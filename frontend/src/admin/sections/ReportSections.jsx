import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import SectionHeader from '../components/SectionHeader';
import { adminService } from '../../services/adminService';

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const useReport = (loader) => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    try {
      setState({ loading: false, error: '', data: await loader() });
    } catch (error) {
      setState({ loading: false, error: error.message || 'Không thể tải báo cáo.', data: null });
    }
  }, [loader]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  return { ...state, reload: load };
};

const ReportState = ({ report, children }) => {
  if (report.loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;
  if (report.error) return <Alert severity="error" action={<Button onClick={report.reload}>Thử lại</Button>}>{report.error}</Alert>;
  return children;
};

export const RevenueReportSection = () => {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const revenueLoader = useCallback(() => {
    const [year, selectedMonth] = month.split('-').map(Number);
    return adminService.getMonthlyRevenue(year, selectedMonth);
  }, [month]);
  const report = useReport(revenueLoader);
  const revenue = report.data;
  const daily = revenue?.daily || [];
  const movies = revenue?.movies || [];
  const max = Math.max(...daily.map((item) => Number(item.revenue)), 1);
  const maxMovieRevenue = Math.max(...movies.map((item) => Number(item.revenue)), 1);
  const cards = [
    { label: 'Tổng doanh thu toàn hệ thống', value: money(revenue?.allTimeRevenue), icon: <AccountBalanceWalletRoundedIcon />, color: '#a78bfa' },
    { label: 'Doanh thu tháng đã chọn', value: money(revenue?.monthRevenue), icon: <PaymentsRoundedIcon />, color: '#4ade80' },
    { label: 'Tăng trưởng so với tháng trước', value: `${Number(revenue?.growthPercent || 0) > 0 ? '+' : ''}${revenue?.growthPercent || 0}%`, icon: <TrendingUpRoundedIcon />, color: Number(revenue?.growthPercent || 0) >= 0 ? '#38bdf8' : '#fb7185' },
    { label: 'Đơn hàng đã thanh toán', value: revenue?.paidOrders || 0, icon: <LocalMoviesRoundedIcon />, color: '#fbbf24' },
  ];
  return (
    <>
      <SectionHeader title="Báo cáo doanh thu" subtitle="Tổng quan toàn hệ thống, doanh thu theo tháng và hiệu quả từng phim" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField type="month" size="small" label="Tháng báo cáo" value={month} onChange={(event) => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 210 }} />
      </Stack>
      <ReportState report={report}>
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            {cards.map((card) => <Box key={card.label} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': card.color }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="body2" color="text.secondary">{card.label}</Typography><Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>{card.value}</Typography></Box><Box sx={{ color: card.color, p: 1, borderRadius: 2, bgcolor: `${card.color}18` }}>{card.icon}</Box></Stack>
            </Box>)}
          </Box>

          <Box className="admin-panel" sx={{ p: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 3 }}><Box><Typography variant="h6" fontWeight={850}>Biểu đồ doanh thu theo ngày</Typography><Typography variant="body2" color="text.secondary">Rạp: {money(revenue?.cinemaRevenue)} · Online: {money(revenue?.onlineRevenue)}</Typography></Box><Chip label={`${daily.length} ngày`} /></Stack>
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" alignItems="flex-end" sx={{ height: 230, minWidth: 760, gap: 0.75 }}>
                {daily.map((item, index) => <Stack key={item.date} alignItems="center" justifyContent="flex-end" title={`${shortDate(item.date)}: ${money(item.revenue)}`} sx={{ flex: 1, height: '100%', minWidth: 18 }}>
                  <Box className="admin-chart-bar" sx={{ width: '100%', maxWidth: 24, height: `${Math.max(Number(item.revenue) / max * 82, 2)}%` }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: 10 }}>{index % 5 === 0 || index === daily.length - 1 ? new Date(`${item.date}T00:00:00`).getDate() : ''}</Typography>
                </Stack>)}
              </Stack>
            </Box>
          </Box>

          <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 3, pb: 1 }}><Typography variant="h6" fontWeight={850}>Doanh thu theo phim</Typography><Typography variant="body2" color="text.secondary">Xếp hạng theo doanh thu trong tháng đã chọn</Typography></Box>
            <TableContainer><Table><TableHead><TableRow><TableCell sx={thSx}>#</TableCell><TableCell sx={thSx}>Phim</TableCell><TableCell sx={thSx}>Đơn hàng</TableCell><TableCell sx={thSx}>Vé</TableCell><TableCell sx={thSx}>Tỷ trọng</TableCell><TableCell sx={thSx} align="right">Doanh thu</TableCell></TableRow></TableHead><TableBody>
              {movies.map((item, index) => <TableRow key={item.movieId} className="admin-table-row"><TableCell><Chip size="small" label={index + 1} color={index < 3 ? 'primary' : 'default'} /></TableCell><TableCell><Typography fontWeight={800}>{item.movieTitle}</Typography></TableCell><TableCell>{item.orders}</TableCell><TableCell>{item.tickets}</TableCell><TableCell sx={{ minWidth: 150 }}><LinearProgress variant="determinate" value={Number(item.revenue) / maxMovieRevenue * 100} sx={{ height: 7, borderRadius: 99 }} /></TableCell><TableCell align="right"><Typography fontWeight={900} color="#4ade80">{money(item.revenue)}</Typography></TableCell></TableRow>)}
              {!movies.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>Chưa có giao dịch thành công trong tháng này.</TableCell></TableRow>}
            </TableBody></Table></TableContainer>
          </Box>
        </>
      </ReportState>
    </>
  );
};

export const TicketsReportSection = () => {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const loader = useCallback(() => {
    const [year, selectedMonth] = month.split('-').map(Number);
    return adminService.getMonthlyTickets(year, selectedMonth);
  }, [month]);
  const report = useReport(loader);
  const data = report.data;
  const daily = data?.daily || [];
  const movies = data?.movies || [];
  const maxDaily = Math.max(...daily.map((item) => Number(item.tickets)), 1);
  const maxMovie = Math.max(...movies.map((item) => Number(item.tickets)), 1);
  const cards = [
    { label: 'Tổng vé toàn hệ thống', value: Number(data?.allTimeTickets || 0).toLocaleString('vi-VN'), icon: <ConfirmationNumberRoundedIcon />, color: '#a78bfa' },
    { label: 'Vé bán trong tháng', value: Number(data?.totalTickets || 0).toLocaleString('vi-VN'), icon: <EventSeatRoundedIcon />, color: '#38bdf8' },
    { label: 'Vé đã check-in', value: `${data?.checkedInTickets || 0} · ${data?.checkInRate || 0}%`, icon: <HowToRegRoundedIcon />, color: '#4ade80' },
    { label: 'Giá trị trung bình / vé', value: money(data?.averageTicketValue), icon: <SpeedRoundedIcon />, color: '#fbbf24' },
  ];
  return (
    <>
      <SectionHeader title="Thống kê vé" subtitle="Tổng quan theo tháng, xu hướng bán vé, tỷ lệ check-in và hiệu quả từng phim" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mb: 2 }}><TextField type="month" size="small" label="Tháng báo cáo" value={month} onChange={(event) => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 210 }} /></Stack>
      <ReportState report={report}>
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>{cards.map((card) => <Box key={card.label} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': card.color }}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="body2" color="text.secondary">{card.label}</Typography><Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>{card.value}</Typography></Box><Box sx={{ color: card.color, bgcolor: `${card.color}18`, p: 1, borderRadius: 2 }}>{card.icon}</Box></Stack></Box>)}</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 2, mb: 2 }}>
            <Box className="admin-panel" sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography variant="h6" fontWeight={850}>Vé bán theo ngày</Typography><Typography variant="body2" color="text.secondary">Cột sáng thể hiện vé đã check-in</Typography></Box><Chip label={`${data?.paidOrders || 0} đơn đã thanh toán`} /></Stack><Box sx={{ overflowX: 'auto' }}><Stack direction="row" alignItems="flex-end" sx={{ height: 230, minWidth: 760, gap: .8 }}>{daily.map((item, index) => <Stack key={item.date} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', flex: 1, minWidth: 18 }} title={`${shortDate(item.date)}: ${item.tickets} vé`}><Box sx={{ width: '100%', maxWidth: 26, height: `${Math.max(Number(item.tickets) / maxDaily * 82, 2)}%`, bgcolor: 'rgba(56,189,248,.3)', borderRadius: '6px 6px 2px 2px', display: 'flex', alignItems: 'flex-end' }}><Box sx={{ width: '100%', height: `${item.tickets ? Number(item.checkedIn) / Number(item.tickets) * 100 : 0}%`, bgcolor: '#4ade80', borderRadius: '5px 5px 2px 2px' }} /></Box><Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: 10 }}>{index % 5 === 0 || index === daily.length - 1 ? new Date(`${item.date}T00:00:00`).getDate() : ''}</Typography></Stack>)}</Stack></Box></Box>
            <Box className="admin-panel" sx={{ p: 3 }}><Typography variant="h6" fontWeight={850}>Điểm nổi bật</Typography><Stack spacing={2.5} sx={{ mt: 3 }}><Box><Typography color="text.secondary">Doanh thu gắn với vé</Typography><Typography variant="h5" fontWeight={900} color="#4ade80">{money(data?.totalRevenue)}</Typography></Box><Box><Typography color="text.secondary">Ngày bán cao nhất</Typography><Typography variant="h5" fontWeight={900}>{data?.peakDate ? new Date(`${data.peakDate}T00:00:00`).toLocaleDateString('vi-VN') : '—'}</Typography><Typography variant="body2" color="text.secondary">{data?.peakTickets || 0} vé</Typography></Box><Box><Typography color="text.secondary">Tỷ lệ check-in</Typography><LinearProgress variant="determinate" value={Math.min(Number(data?.checkInRate || 0), 100)} color="success" sx={{ height: 10, borderRadius: 10, mt: 1 }} /><Typography fontWeight={850} sx={{ mt: 1 }}>{data?.checkInRate || 0}%</Typography></Box></Stack></Box>
          </Box>
          <Box className="admin-panel" sx={{ overflow: 'hidden' }}><Box sx={{ p: 3, pb: 1 }}><Typography variant="h6" fontWeight={850}>Hiệu quả theo phim</Typography><Typography variant="body2" color="text.secondary">Xếp hạng theo số vé bán trong tháng</Typography></Box><TableContainer><Table><TableHead><TableRow><TableCell sx={thSx}>#</TableCell><TableCell sx={thSx}>Phim</TableCell><TableCell sx={thSx}>Đơn hàng</TableCell><TableCell sx={thSx}>Vé bán</TableCell><TableCell sx={thSx}>Tỷ trọng</TableCell><TableCell sx={thSx} align="right">Doanh thu</TableCell></TableRow></TableHead><TableBody>{movies.map((item, index) => <TableRow key={item.movieId} className="admin-table-row"><TableCell><Chip size="small" label={index + 1} color={index < 3 ? 'primary' : 'default'} /></TableCell><TableCell><Typography fontWeight={800}>{item.movieTitle}</Typography></TableCell><TableCell>{item.orders}</TableCell><TableCell>{item.tickets}</TableCell><TableCell sx={{ minWidth: 160 }}><LinearProgress variant="determinate" value={Number(item.tickets) / maxMovie * 100} sx={{ height: 7, borderRadius: 9 }} /></TableCell><TableCell align="right"><Typography fontWeight={900} color="#4ade80">{money(item.revenue)}</Typography></TableCell></TableRow>)}{!movies.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>Chưa có vé trong tháng này.</TableCell></TableRow>}</TableBody></Table></TableContainer></Box>
        </>
      </ReportState>
    </>
  );
};

export const CustomersReportSection = () => {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const loader = useCallback(() => { const [year, selectedMonth] = month.split('-').map(Number); return adminService.getMonthlyCustomers(year, selectedMonth); }, [month]);
  const report = useReport(loader);
  const data = report.data;
  const daily = data?.daily || [];
  const segments = data?.segments || [];
  const topCustomers = data?.topCustomers || [];
  const maxDaily = Math.max(...daily.map((item) => Number(item.activeCustomers)), 1);
  const maxSegment = Math.max(...segments.map((item) => Number(item.count)), 1);
  const cards = [
    { label: 'Tổng thành viên', value: data?.totalMembers || 0, color: '#a78bfa', icon: <GroupsRoundedIcon /> },
    { label: 'Khách hoạt động trong tháng', value: data?.activeCustomers || 0, color: '#38bdf8', icon: <HowToRegRoundedIcon /> },
    { label: 'Khách mua lần đầu', value: data?.newBuyers || 0, color: '#4ade80', icon: <PersonAddRoundedIcon /> },
    { label: 'Tỷ lệ khách quay lại', value: `${data?.repeatRate || 0}%`, color: '#fbbf24', icon: <RepeatRoundedIcon /> },
  ];
  return (
    <>
      <SectionHeader title="Thống kê khách hàng" subtitle="Tăng trưởng khách mua vé, tỷ lệ quay lại, phân nhóm và top khách hàng theo tháng" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mb: 2 }}><TextField type="month" size="small" label="Tháng báo cáo" value={month} onChange={(event) => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 210 }} /></Stack>
      <ReportState report={report}>
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>{cards.map((card) => <Box key={card.label} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': card.color }}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="body2" color="text.secondary">{card.label}</Typography><Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>{card.value}</Typography></Box><Box sx={{ color: card.color, bgcolor: `${card.color}18`, p: 1, borderRadius: 2 }}>{card.icon}</Box></Stack></Box>)}</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.7fr 1fr' }, gap: 2, mb: 2 }}>
            <Box className="admin-panel" sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}><Box><Typography variant="h6" fontWeight={850}>Khách phát sinh giao dịch theo ngày</Typography><Typography variant="body2" color="text.secondary">Số khách riêng biệt có booking xác nhận</Typography></Box><Chip label={`${data?.monthOrders || 0} đơn`} /></Stack><Box sx={{ overflowX: 'auto' }}><Stack direction="row" alignItems="flex-end" sx={{ height: 230, minWidth: 760, gap: .8 }}>{daily.map((item, index) => <Stack key={item.date} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', flex: 1, minWidth: 18 }} title={`${shortDate(item.date)}: ${item.activeCustomers} khách · ${item.orders} đơn`}><Box className="admin-chart-bar" sx={{ width: '100%', maxWidth: 25, height: `${Math.max(Number(item.activeCustomers) / maxDaily * 82, 2)}%` }} /><Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: 10 }}>{index % 5 === 0 || index === daily.length - 1 ? new Date(`${item.date}T00:00:00`).getDate() : ''}</Typography></Stack>)}</Stack></Box></Box>
            <Box className="admin-panel" sx={{ p: 3 }}><Stack direction="row" spacing={1} alignItems="center"><WorkspacePremiumRoundedIcon color="primary" /><Typography variant="h6" fontWeight={850}>Phân nhóm khách hàng</Typography></Stack><Stack spacing={2.1} sx={{ mt: 3 }}>{segments.map((segment) => <Box key={segment.key}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">{segment.label}</Typography><Typography fontWeight={850}>{segment.count}</Typography></Stack><LinearProgress variant="determinate" value={Number(segment.count) / maxSegment * 100} sx={{ height: 8, borderRadius: 8, mt: .7 }} /></Box>)}</Stack></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>{[['Tổng chi tiêu trong tháng', money(data?.monthSpend), '#4ade80'], ['Chi tiêu TB / khách hoạt động', money(data?.averageSpend), '#38bdf8'], ['Khách trung thành toàn hệ thống', data?.loyalCustomers || 0, '#fbbf24']].map(([label, value, color]) => <Box key={label} className="admin-panel" sx={{ p: 2.5 }}><Typography color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900} sx={{ color, mt: 1 }}>{value}</Typography></Box>)}</Box>
          <Box className="admin-panel" sx={{ overflow: 'hidden' }}><Box sx={{ p: 3, pb: 1 }}><Typography variant="h6" fontWeight={850}>Top khách hàng trong tháng</Typography><Typography variant="body2" color="text.secondary">Xếp hạng theo số tiền thanh toán thành công</Typography></Box><TableContainer><Table><TableHead><TableRow><TableCell sx={thSx}>#</TableCell><TableCell sx={thSx}>Khách hàng</TableCell><TableCell sx={thSx}>Phân nhóm</TableCell><TableCell sx={thSx}>Đơn hàng</TableCell><TableCell sx={thSx}>Lần mua gần nhất</TableCell><TableCell sx={thSx} align="right">Chi tiêu</TableCell></TableRow></TableHead><TableBody>{topCustomers.map((item, index) => <TableRow key={item.customerId} className="admin-table-row"><TableCell><Chip size="small" label={index + 1} color={index < 3 ? 'primary' : 'default'} /></TableCell><TableCell><Typography fontWeight={800}>{item.name || 'Khách hàng'}</Typography><Typography variant="caption" color="text.secondary">{item.email}</Typography></TableCell><TableCell><Chip size="small" color={item.segment === 'LOYAL' ? 'warning' : item.segment === 'RETURNING' ? 'info' : 'success'} label={item.segment === 'LOYAL' ? 'Trung thành' : item.segment === 'RETURNING' ? 'Quay lại' : 'Mới'} /></TableCell><TableCell>{item.orders}</TableCell><TableCell>{item.lastPurchase ? new Date(`${item.lastPurchase}T00:00:00`).toLocaleDateString('vi-VN') : '—'}</TableCell><TableCell align="right"><Typography fontWeight={900} color="#4ade80">{money(item.spend)}</Typography></TableCell></TableRow>)}{!topCustomers.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 7, color: 'text.secondary' }}>Chưa có khách hàng phát sinh giao dịch trong tháng.</TableCell></TableRow>}</TableBody></Table></TableContainer></Box>
        </>
      </ReportState>
    </>
  );
};
