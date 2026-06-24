import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import SectionHeader from '../components/SectionHeader';
import { staffReportService } from '../../services/staffReportService';

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

const revenueLoader = () => Promise.all([staffReportService.revenue(), staffReportService.topMovies(10)]);
export const RevenueReportSection = () => {
  const report = useReport(revenueLoader);
  const [revenue, topMovies] = report.data || [];
  const daily = revenue?.daily || [];
  const max = Math.max(...daily.map((item) => Number(item.total)), 1);
  return (
    <>
      <SectionHeader title="Báo cáo doanh thu" subtitle="Dữ liệu thanh toán thành công trong 7 ngày gần nhất" />
      <ReportState report={report}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 2 }}>
          <Box className="admin-panel" sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={800} color="#4ade80">{money(revenue?.totalRevenue)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Tổng doanh thu vé</Typography>
            <Stack direction="row" alignItems="flex-end" sx={{ height: 170, gap: 1.5 }}>
              {daily.map((item) => (
                <Stack key={item.date} alignItems="center" justifyContent="flex-end" sx={{ flex: 1, height: '100%' }}>
                  <Typography variant="caption">{money(item.total)}</Typography>
                  <Box className="admin-chart-bar" sx={{ minHeight: 2, width: '100%', maxWidth: 40, height: `${Number(item.total) / max * 85}%` }} />
                  <Typography variant="caption" color="text.secondary">{shortDate(item.date)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box className="admin-panel" sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Top phim bán chạy</Typography>
            <Stack spacing={1.5}>
              {(topMovies?.items || []).map((item, index) => (
                <Stack key={item.movieId} direction="row" justifyContent="space-between">
                  <Typography variant="body2">#{index + 1} {item.movieTitle}</Typography>
                  <Typography variant="body2" fontWeight={700}>{item.tickets} vé · {money(item.revenue)}</Typography>
                </Stack>
              ))}
              {!topMovies?.items?.length && <Typography color="text.secondary">Chưa có giao dịch.</Typography>}
            </Stack>
          </Box>
        </Box>
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
