import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Chip,
  Divider,
  TextField,
  Alert,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded';
import OndemandVideoRoundedIcon from '@mui/icons-material/OndemandVideoRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { staffReportService } from '../../services/staffReportService';

const formatCurrency = (n) =>
  typeof n === 'number' ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : '—';
const formatShortDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
};
const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const StaffReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  const loadAll = useCallback(async (from, to) => {
    setLoading(true);
    setError('');
    try {
      const [revenue, tickets, online, topMovies, topShowtimes] = await Promise.all([
        staffReportService.revenue(from || undefined, to || undefined),
        staffReportService.ticketSales(from || undefined, to || undefined),
        staffReportService.onlineMovieSales(from || undefined, to || undefined),
        staffReportService.topMovies(),
        staffReportService.topShowtimes(),
      ]);
      setData({ revenue, tickets, online, topMovies, topShowtimes });
    } catch (err) {
      setError(err.message || 'Không thể tải báo cáo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" onClick={() => loadAll(fromDate, toDate)}>Thử lại</Button>
      </Box>
    );
  }

  const { revenue, tickets, online, topMovies, topShowtimes } = data;
  const dailyRows = [...(revenue?.daily || [])].sort(
    (left, right) => Date.parse(right.date) - Date.parse(left.date),
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(dailyRows.length / rowsPerPage) - 1));
  const pagedDailyRows = dailyRows.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);
  const maxDaily = Math.max(...dailyRows.map((day) => day.total), 1);

  const handleFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setFilterError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setFilterError('');
    setPage(0);
    loadAll(fromDate, toDate);
  };

  const handleClearFilter = () => {
    setFromDate('');
    setToDate('');
    setFilterError('');
    setPage(0);
    loadAll();
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentRoundedIcon color="primary" /> Báo cáo cơ bản
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Doanh thu, vé bán, lượt xem online, top phim và top suất chiếu (7 ngày gần nhất).
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField
          type="date"
          label="Từ ngày"
          size="small"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 180 } }}
        />
        <TextField
          type="date"
          label="Đến ngày"
          size="small"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 180 } }}
        />
        <Button variant="contained" onClick={handleFilter}>Tra cứu</Button>
        {(fromDate || toDate) && <Button onClick={handleClearFilter}>Xóa lọc</Button>}
      </Stack>
      {filterError && <Alert severity="error" sx={{ mb: 3 }}>{filterError}</Alert>}

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <KpiCard icon={<PaidRoundedIcon />} label="Tổng doanh thu" value={formatCurrency(revenue?.totalRevenue)} color="#22c55e" />
        <KpiCard icon={<TheatersRoundedIcon />} label="Doanh thu vé rạp" value={formatCurrency(revenue?.cinemaRevenue)} color="#3b82f6" />
        <KpiCard icon={<OndemandVideoRoundedIcon />} label="Doanh thu phim online" value={formatCurrency(revenue?.onlineRevenue)} color="#a855f7" />
        <KpiCard icon={<ConfirmationNumberRoundedIcon />} label="Số vé bán được" value={tickets?.totalTickets ?? 0} color="#f59e0b" />
        <KpiCard icon={<VisibilityRoundedIcon />} label="Lượt xem phim online" value={online?.totalViews ?? 0} color="#ec4899" />
      </Grid>

      {/* Biểu đồ doanh thu theo ngày */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Doanh thu theo ngày</Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Legend color="#3b82f6" label="Vé rạp" />
            <Legend color="#a855f7" label="Phim online" />
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1, sm: 2 }, height: 220, px: 1 }}>
            {dailyRows.map((d) => {
              const totalH = (d.total / maxDaily) * 100;
              const cinemaH = d.total ? (d.cinema / d.total) * totalH : 0;
              const onlineH = d.total ? (d.online / d.total) * totalH : 0;
              return (
                <Box key={d.date} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: 42, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <Box title={`Online: ${formatCurrency(d.online)}`} sx={{ height: `${onlineH}%`, bgcolor: '#a855f7', borderRadius: '6px 6px 0 0' }} />
                    <Box title={`Vé rạp: ${formatCurrency(d.cinema)}`} sx={{ height: `${cinemaH}%`, bgcolor: '#3b82f6' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{formatShortDate(d.date)}</Typography>
                </Box>
              );
            })}
            {dailyRows.length === 0 && (
              <Typography color="text.secondary" sx={{ alignSelf: 'center', width: '100%', textAlign: 'center' }}>
                Không có dữ liệu trong khoảng thời gian này.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Top phim bán chạy */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🏆 Top phim bán chạy</Typography>
              <Stack spacing={1.5}>
                {(topMovies?.items || []).map((m, i) => {
                  const max = Math.max(...topMovies.items.map((x) => x.tickets), 1);
                  return (
                    <Box key={m.movieTitle}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                        <Typography variant="body2" fontWeight={600}>
                          <Box component="span" sx={{ color: 'primary.main', fontWeight: 800, mr: 0.5 }}>#{i + 1}</Box>
                          {m.movieTitle}
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>{m.tickets} vé</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={(m.tickets / max) * 100} sx={{ height: 7, borderRadius: 3 }} />
                      <Typography variant="caption" color="text.secondary">{formatCurrency(m.revenue)}</Typography>
                    </Box>
                  );
                })}
                {(topMovies?.items || []).length === 0 && (
                  <Typography color="text.secondary">Chưa có dữ liệu phim bán chạy.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Top suất chiếu đông khách */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🔥 Top suất chiếu đông khách</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Phim / Phòng</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Suất</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Lấp đầy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(topShowtimes?.items || []).map((s, i) => {
                      const pct = s.capacity ? Math.round((s.sold / s.capacity) * 100) : 0;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{s.movieTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.room}</Typography>
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}><Typography variant="caption">{formatDateTime(s.startTime)}</Typography></TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={`${s.sold}/${s.capacity} · ${pct}%`} color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'default'} sx={{ fontWeight: 700 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(topShowtimes?.items || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                          Chưa có dữ liệu suất chiếu.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chi tiết doanh thu + vé + lượt xem theo ngày */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Chi tiết theo ngày</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Vé rạp</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Phim online</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Tổng doanh thu</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Số vé</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Lượt xem online</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedDailyRows.map((d) => (
                  <TableRow key={d.date} hover>
                    <TableCell>{formatShortDate(d.date)}</TableCell>
                    <TableCell align="right">{formatCurrency(d.cinema)}</TableCell>
                    <TableCell align="right">{formatCurrency(d.online)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(d.total)}</TableCell>
                    <TableCell align="right">{tickets?.daily?.find((item) => item.date === d.date)?.tickets ?? '—'}</TableCell>
                    <TableCell align="right">{online?.daily?.find((item) => item.date === d.date)?.views ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {dailyRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      Không có dữ liệu trong khoảng thời gian này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {dailyRows.length > 0 && (
            <TablePagination
              component="div"
              count={dailyRows.length}
              page={currentPage}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
            />
          )}
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            Tổng: {formatCurrency(revenue?.totalRevenue)} · {tickets?.totalTickets ?? 0} vé · {online?.totalViews ?? 0} lượt xem online
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

const KpiCard = ({ icon, label, value, color }) => (
  <Grid item xs={12} sm={6} md={2.4}>
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}22`, color }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  </Grid>
);

const Legend = ({ color, label }) => (
  <Stack direction="row" spacing={0.7} alignItems="center">
    <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Stack>
);

export default StaffReports;
