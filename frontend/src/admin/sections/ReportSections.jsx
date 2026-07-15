import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import SectionHeader from '../components/SectionHeader';
import { staffReportService } from '../../services/staffReportService';
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

const ticketsLoader = () => Promise.all([staffReportService.ticketSales(), staffReportService.topShowtimes(10)]);
export const TicketsReportSection = () => {
  const report = useReport(ticketsLoader);
  const [tickets, topShowtimes] = report.data || [];
  return (
    <>
      <SectionHeader title="Thống kê vé" subtitle="Vé thuộc đơn hàng đã thanh toán trong 7 ngày gần nhất" />
      <ReportState report={report}>
        <Box className="admin-panel admin-stat-card" sx={{ p: 3, mb: 2, '--accent': '#22c55e' }}>
          <Typography color="text.secondary">Vé đã bán</Typography>
          <Typography variant="h3" fontWeight={800}>{tickets?.totalTickets || 0}</Typography>
          <Typography variant="body2" color="text.secondary">Doanh thu: {money(tickets?.totalAmount)}</Typography>
        </Box>
        <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
          <TableContainer><Table size="small"><TableHead><TableRow>
            <TableCell sx={thSx}>Phim</TableCell><TableCell sx={thSx}>Phòng</TableCell><TableCell sx={thSx}>Thời gian</TableCell><TableCell sx={thSx}>Lấp đầy</TableCell>
          </TableRow></TableHead><TableBody>
            {(topShowtimes?.items || []).map((item) => {
              const percent = item.capacity ? Math.round(item.sold / item.capacity * 100) : 0;
              return <TableRow key={item.showtimeId}><TableCell>{item.movieTitle}</TableCell><TableCell>{item.room}</TableCell>
                <TableCell>{new Date(item.startTime).toLocaleString('vi-VN')}</TableCell>
                <TableCell><Chip size="small" label={`${item.sold}/${item.capacity} · ${percent}%`} /></TableCell></TableRow>;
            })}
          </TableBody></Table></TableContainer>
        </Box>
      </ReportState>
    </>
  );
};

const customerLoader = () => staffReportService.customers();
export const CustomersReportSection = () => {
  const report = useReport(customerLoader);
  const data = report.data;
  const cards = [
    ['Tổng thành viên', data?.totalMembers || 0, '#6366f1'],
    ['Khách trung thành (≥5 đơn)', data?.loyalCustomers || 0, '#e50914'],
    ['Khách đã mua vé', data?.activeCustomers || 0, '#22c55e'],
    ['Chưa mua vé', data?.customersWithoutPurchase || 0, '#f59e0b'],
  ];
  return (
    <>
      <SectionHeader title="Thống kê khách hàng" subtitle="Phân nhóm từ lịch sử đơn hàng đã thanh toán" />
      <ReportState report={report}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {cards.map(([label, value, color]) => <Box key={label} className="admin-panel admin-stat-card" sx={{ p: 3, '--accent': color }}>
            <Typography color="text.secondary">{label}</Typography><Typography variant="h3" fontWeight={800}>{value}</Typography>
          </Box>)}
        </Box>
        <Box className="admin-panel" sx={{ p: 3, mt: 2 }}><Typography color="text.secondary">Chi tiêu trung bình mỗi thành viên</Typography><Typography variant="h4" fontWeight={800} color="#4ade80">{money(data?.averageSpend)}</Typography></Box>
      </ReportState>
    </>
  );
};
