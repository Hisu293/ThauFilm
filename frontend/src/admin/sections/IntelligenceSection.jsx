import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import OnlinePredictionRoundedIcon from '@mui/icons-material/OnlinePredictionRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { adminIntelligenceService } from '../../services/intelligenceService';

const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const localDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const localDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tabItems = [
  { label: 'Heatmap ghế', description: 'Phân tích hành vi chọn chỗ', icon: EventSeatRoundedIcon },
  { label: 'Giá vé động', description: 'Tối ưu giá theo nhu cầu', icon: PaidRoundedIcon },
  { label: 'Lập lịch AI', description: 'Điều phối suất chiếu tuần', icon: CalendarMonthRoundedIcon },
];

const panelSx = { borderRadius: 3, boxShadow: 'none', overflow: 'hidden' };

const Metric = ({ label, value, icon: Icon, color = 'primary.main', helper }) => (
  <Card sx={{ ...panelSx, height: '100%' }}>
    <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={950} sx={{ mt: 0.5 }}>{value}</Typography></Box>
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'action.hover', color }}><Icon fontSize="small" /></Avatar>
      </Stack>
      {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
    </CardContent>
  </Card>
);

export default function IntelligenceSection({ rooms = [], movies = [], onShowtimesChanged }) {
  const [tab, setTab] = useState(0);
  const ActiveIcon = tabItems[tab].icon;

  return <Stack spacing={3}>
    <Card sx={{ ...panelSx, position: 'relative' }}>
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 12% 0%, rgba(229,9,20,.25), transparent 36%), radial-gradient(circle at 92% 90%, rgba(99,102,241,.2), transparent 36%)' }} />
      <CardContent sx={{ position: 'relative', p: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3}>
          <Stack direction="row" spacing={1.6} alignItems="center">
            <Avatar sx={{ width: 54, height: 54, bgcolor: 'rgba(229,9,20,.16)', color: 'primary.main' }}><InsightsRoundedIcon /></Avatar>
            <Box>
              <Chip size="small" icon={<AutoAwesomeRoundedIcon />} label="AI OPERATIONS" color="primary" sx={{ mb: 1, fontWeight: 850 }} />
              <Typography variant="h4" fontWeight={950}>Cinema Intelligence</Typography>
              <Typography color="text.secondary">Biến dữ liệu ghế, nhu cầu và lịch chiếu thành quyết định vận hành.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<MeetingRoomRoundedIcon />} label={`${rooms.length} phòng chiếu`} variant="outlined" />
            <Chip icon={<MovieRoundedIcon />} label={`${movies.length} phim trong hệ thống`} variant="outlined" />
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <Card sx={panelSx}>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: 1.5, pt: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {tabItems.map(({ label, icon: Icon }) => <Tab key={label} icon={<Icon />} iconPosition="start" label={label} sx={{ minHeight: 58, fontWeight: 800 }} />)}
      </Tabs>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2.5}>
          <Avatar sx={{ bgcolor: 'action.hover', color: 'primary.main' }}><ActiveIcon /></Avatar>
          <Box><Typography variant="h6" fontWeight={900}>{tabItems[tab].label}</Typography><Typography variant="body2" color="text.secondary">{tabItems[tab].description}</Typography></Box>
        </Stack>
        {tab === 0 && <Heatmap rooms={rooms} />}
        {tab === 1 && <Pricing movies={movies} />}
        {tab === 2 && <WeeklyManager movies={movies} onApplied={onShowtimesChanged} />}
      </Box>
    </Card>
  </Stack>;
}

const Heatmap = ({ rooms }) => {
  const [roomId, setRoomId] = useState('');
  const [zone, setZone] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedRoomId = roomId || rooms[0]?.id || '';

  const analyze = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    setError('');
    try {
      setData(await adminIntelligenceService.heatmap(selectedRoomId));
    } catch (err) {
      setError(err.message || 'Không thể phân tích dữ liệu ghế.');
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => (data?.seats || []).reduce((result, seat) => {
    result[seat.row] = [...(result[seat.row] || []), seat];
    return result;
  }, {}), [data]);
  const hotSeats = useMemo(() => [...(data?.seats || [])].sort((a, b) => b.selectedCount - a.selectedCount).slice(0, 5), [data]);
  const averageHeat = data?.seats?.length ? Math.round(data.seats.reduce((sum, seat) => sum + Number(seat.heat || 0), 0) / data.seats.length) : 0;

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
      <TextField select size="small" label="Phòng chiếu" value={selectedRoomId} onChange={(event) => { setRoomId(event.target.value); setData(null); }} sx={{ minWidth: 260 }}>
        {rooms.map((room) => <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label="Vùng ghế" value={zone} onChange={(event) => setZone(event.target.value)} sx={{ minWidth: 170 }}>
        <MenuItem value="ALL">Tất cả vùng</MenuItem><MenuItem value="CENTER">Ghế trung tâm</MenuItem><MenuItem value="EDGE">Ghế cạnh</MenuItem>
      </TextField>
      <Button variant="contained" disabled={!selectedRoomId || loading} onClick={analyze} startIcon={loading ? <CircularProgress size={17} /> : <AutoAwesomeRoundedIcon />}>
        Phân tích phòng
      </Button>
    </Stack>
    {!rooms.length && <Alert severity="warning">Chưa có phòng chiếu để phân tích.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}

    {!data && !loading && rooms.length > 0 && <Box sx={{ py: 7, border: '1px dashed', borderColor: 'divider', borderRadius: 3, textAlign: 'center' }}>
      <Avatar sx={{ mx: 'auto', mb: 1.5, width: 56, height: 56, bgcolor: 'action.hover', color: 'primary.main' }}><EventSeatRoundedIcon /></Avatar>
      <Typography fontWeight={850}>Chọn phòng và bắt đầu phân tích</Typography>
      <Typography variant="body2" color="text.secondary">AI sẽ tổng hợp lịch sử booking thật để xác định vùng ghế được ưu tiên.</Typography>
    </Box>}

    {data && <>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }} gap={1.5}>
        <Metric label="Booking mẫu" value={data.sampleBookings || 0} icon={ReceiptLongIcon} color="info.main" helper="Đơn xác nhận trong dữ liệu" />
        <Metric label="Lợi thế ghế giữa" value={`${data.centerAdvantagePercent || 0}%`} icon={TrendingUpRoundedIcon} color="warning.main" helper="So với vùng ghế cạnh" />
        <Metric label="Hàng ghế nóng" value={(data.hotRows || []).join(' · ') || '—'} icon={BoltRoundedIcon} color="error.main" helper="Có tần suất chọn cao nhất" />
        <Metric label="Cường độ trung bình" value={`${averageHeat}%`} icon={InsightsRoundedIcon} color="primary.main" helper="Theo thang nhiệt của phòng" />
      </Box>

      <Alert severity="info" icon={<AutoAwesomeRoundedIcon />}><b>{data.insight}</b><br />{data.pricingSuggestion}</Alert>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={2}>
        <Card sx={panelSx}>
          <CardContent sx={{ p: { xs: 2, md: 3 }, overflowX: 'auto' }}>
            <Box sx={{ width: '70%', minWidth: 420, height: 7, mx: 'auto', mb: 3, bgcolor: 'divider', borderRadius: '50% 50% 4px 4px', boxShadow: '0 8px 24px rgba(56,189,248,.18)' }} />
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={2}>MÀN HÌNH</Typography>
            <Stack spacing={1.1} sx={{ minWidth: 520 }}>
              {Object.entries(rows).map(([row, seats]) => <Stack key={row} direction="row" spacing={0.8} alignItems="center" justifyContent="center">
                <Typography variant="caption" color="text.secondary" sx={{ width: 22 }}>{row}</Typography>
                {seats.map((seat) => {
                  const highlighted = zone === 'ALL' || seat.zone === zone;
                  const alpha = Math.max(0.1, Number(seat.heat || 0) / 100);
                  return <Tooltip key={seat.seatId} arrow title={`${seat.label} · ${seat.selectedCount} lượt chọn · Nhiệt ${seat.heat}%`}>
                    <Box sx={{ width: 40, height: 36, display: 'grid', placeItems: 'center', borderRadius: '10px 10px 6px 6px', bgcolor: `rgba(239,68,68,${alpha})`, border: '1px solid rgba(255,255,255,.15)', fontSize: 11, fontWeight: 800, opacity: highlighted ? 1 : 0.16, transition: '.2s', cursor: 'default' }}>{seat.label}</Box>
                  </Tooltip>;
                })}
              </Stack>)}
            </Stack>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} mt={3}>
              <Typography variant="caption" color="text.secondary">Ít chọn</Typography>
              {[0.12, 0.3, 0.5, 0.72, 1].map((alpha) => <Box key={alpha} sx={{ width: 24, height: 10, borderRadius: 1, bgcolor: `rgba(239,68,68,${alpha})` }} />)}
              <Typography variant="caption" color="text.secondary">Nhiều chọn</Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={panelSx}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography fontWeight={900}>Top ghế được chọn</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Xếp hạng theo booking xác nhận.</Typography>
            <Stack spacing={1.25}>{hotSeats.map((seat, index) => <Stack key={seat.seatId} direction="row" alignItems="center" spacing={1.2}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: index === 0 ? 'primary.main' : 'action.hover', fontSize: 12, fontWeight: 900 }}>#{index + 1}</Avatar>
              <Box flex={1}><Typography fontWeight={800}>{seat.label}</Typography><Typography variant="caption" color="text.secondary">{seat.zone === 'CENTER' ? 'Trung tâm' : 'Cạnh rạp'}</Typography></Box>
              <Chip size="small" label={`${seat.selectedCount} lượt`} />
            </Stack>)}</Stack>
          </CardContent>
        </Card>
      </Box>
    </>}
  </Stack>;
};

const ReceiptLongIcon = ({ fontSize }) => <EventSeatRoundedIcon fontSize={fontSize} />;

const Pricing = ({ movies }) => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState('');
  const [appliedIds, setAppliedIds] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems((await adminIntelligenceService.pricing()) || []);
    } catch (err) {
      setError(err.message || 'Không thể phân tích giá các suất chiếu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const apply = async (item) => {
    setApplyingId(item.showtimeId);
    setNotice('');
    setError('');
    try {
      await adminIntelligenceService.applyPricing(item.showtimeId, item.suggestedPrices);
      setAppliedIds((current) => [...new Set([...current, item.showtimeId])]);
      setNotice(`Đã áp dụng giá cho suất ${localDate(item.startTime)}.`);
    } catch (err) {
      setError(err.message || 'Không thể áp dụng mức giá đề xuất.');
    } finally {
      setApplyingId('');
    }
  };

  const summary = useMemo(() => ({
    total: items.length,
    increase: items.filter((item) => item.multiplierPercent > 0).length,
    decrease: items.filter((item) => item.multiplierPercent < 0).length,
    averagePrediction: items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.predictedOccupancyPercent || 0), 0) / items.length) : 0,
  }), [items]);
  const filtered = items.filter((item) => filter === 'ALL' || (filter === 'UP' ? item.multiplierPercent > 0 : filter === 'DOWN' ? item.multiplierPercent < 0 : item.multiplierPercent === 0));

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={`Tất cả ${summary.total}`} color={filter === 'ALL' ? 'primary' : 'default'} onClick={() => setFilter('ALL')} />
        <Chip label={`Đề xuất tăng ${summary.increase}`} color={filter === 'UP' ? 'error' : 'default'} onClick={() => setFilter('UP')} />
        <Chip label={`Đề xuất giảm ${summary.decrease}`} color={filter === 'DOWN' ? 'success' : 'default'} onClick={() => setFilter('DOWN')} />
        <Chip label="Giữ nguyên" color={filter === 'SAME' ? 'info' : 'default'} onClick={() => setFilter('SAME')} />
      </Stack>
      <Button variant="outlined" startIcon={loading ? <CircularProgress size={17} /> : <RefreshRoundedIcon />} disabled={loading} onClick={load}>Phân tích lại</Button>
    </Stack>

    <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }} gap={1.5}>
      <Metric label="Suất sắp tới" value={summary.total} icon={CalendarMonthRoundedIcon} color="info.main" />
      <Metric label="Nên tăng giá" value={summary.increase} icon={TrendingUpRoundedIcon} color="error.main" />
      <Metric label="Nên giảm giá" value={summary.decrease} icon={TuneRoundedIcon} color="success.main" />
      <Metric label="Lấp đầy dự báo" value={`${summary.averagePrediction}%`} icon={InsightsRoundedIcon} color="warning.main" />
    </Box>

    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {loading && !items.length && <Box py={7} display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>}

    <Box display="grid" gridTemplateColumns={{ xs: '1fr', xl: '1fr 1fr' }} gap={2}>
      {filtered.map((item) => {
        const movie = movies.find((entry) => String(entry.id) === String(item.movieId));
        const demandColor = item.predictedOccupancyPercent >= 70 ? 'error' : item.predictedOccupancyPercent <= 40 ? 'success' : 'warning';
        const applied = appliedIds.includes(item.showtimeId);
        return <Card key={item.showtimeId} sx={{ ...panelSx, borderColor: applied ? 'success.main' : 'divider' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Box minWidth={0}><Typography variant="h6" fontWeight={900} noWrap>{movie?.title || 'Phim'}</Typography><Typography variant="body2" color="text.secondary">{item.roomName} · {localDate(item.startTime)}</Typography></Box>
              <Chip size="small" color={item.multiplierPercent > 0 ? 'error' : item.multiplierPercent < 0 ? 'success' : 'default'} label={`${item.multiplierPercent >= 0 ? '+' : ''}${item.multiplierPercent}%`} sx={{ fontWeight: 900 }} />
            </Stack>
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Đã bán {item.sold}/{item.capacity}</Typography><Typography variant="body2" fontWeight={800}>Dự báo {item.predictedOccupancyPercent}%</Typography></Stack>
              <LinearProgress variant="determinate" value={Math.min(100, Number(item.predictedOccupancyPercent || 0))} color={demandColor} sx={{ mt: 1, height: 7, borderRadius: 4 }} />
              <Typography variant="caption" color="text.secondary">Hiện tại {item.occupancyPercent}% · AI lấy mức cao hơn giữa thực tế và dự báo để tính giá.</Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>{Object.entries(item.suggestedPrices || {}).map(([type, price]) => <Chip key={type} variant="outlined" label={`${type}: ${money(price)}`} />)}</Stack>
            <Button fullWidth variant={applied ? 'outlined' : 'contained'} color={applied ? 'success' : 'primary'} startIcon={applied ? <CheckCircleRoundedIcon /> : <BoltRoundedIcon />} disabled={applied || applyingId === item.showtimeId} onClick={() => apply(item)} sx={{ mt: 2 }}>
              {applied ? 'Đã áp dụng' : applyingId === item.showtimeId ? 'Đang áp dụng...' : 'Áp dụng giá đề xuất'}
            </Button>
          </CardContent>
        </Card>;
      })}
    </Box>
    {!loading && !filtered.length && <Alert severity="info">Không có suất chiếu phù hợp với bộ lọc hiện tại.</Alert>}
  </Stack>;
};

const WeeklyManager = ({ movies, onApplied }) => {
  const nextMonday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + ((8 - date.getDay()) % 7 || 7));
    return localDateInput(date);
  }, []);
  const [date, setDate] = useState(nextMonday);
  const [movieId, setMovieId] = useState('');
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestInFlight = useRef(false);
  const availableMovies = useMemo(() => movies.filter((movie) => movie.active !== false && movie.status === 'NOW_SHOWING'), [movies]);

  const generate = async () => {
    if (requestInFlight.current || !movieId || !date) return;
    requestInFlight.current = true;
    setLoading(true);
    setNotice('');
    setError('');
    try {
      setPlan((await adminIntelligenceService.weeklyPlan({ startDate: date, movieId })) || []);
    } catch (err) {
      setError(err.message || 'Không thể tạo kế hoạch tuần.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const apply = async () => {
    if (requestInFlight.current || plan.length === 0) return;
    requestInFlight.current = true;
    setLoading(true);
    setNotice('');
    setError('');
    try {
      const count = plan.length;
      await adminIntelligenceService.applyWeeklyPlan(plan);
      setNotice(`Đã tạo ${count} suất chiếu từ kế hoạch AI.`);
      setPlan([]);
      setConfirmOpen(false);
      await onApplied?.();
    } catch (err) {
      setError(err.message || 'Không thể áp dụng kế hoạch tuần.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const summary = useMemo(() => ({
    showtimes: plan.length,
    theaters: new Set(plan.map((item) => item.theaterId).filter(Boolean)).size,
    rooms: new Set(plan.filter((item) => !item.online).map((item) => item.cinemaRoomId)).size,
    average: plan.length ? Math.round(plan.reduce((sum, item) => sum + Number(item.predictedOccupancyPercent || 0), 0) / plan.length) : 0,
  }), [plan]);
  const groupedPlan = useMemo(() => plan.reduce((groups, item) => {
    const key = new Date(item.startTime).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {}), [plan]);
  const removeItem = (target) => setPlan((current) => current.filter((item) => !(item.movieId === target.movieId && item.cinemaRoomId === target.cinemaRoomId && item.startTime === target.startTime)));

  return <Stack spacing={2.5}>
    <Alert severity="info">Chỉ cần chọn phim. AI tự tìm rạp đang hoạt động, phòng đang hoạt động thuộc đúng rạp và khung giờ còn trống; mỗi suất gồm thời lượng phim và 1 phút chuyển tiếp.</Alert>
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={1.5}>
      <TextField select size="small" label="Phim" value={movieId} onChange={(event) => { setMovieId(event.target.value); setPlan([]); }} disabled={loading}>
        {availableMovies.map((movie) => <MenuItem key={movie.id} value={movie.id}>{movie.title}</MenuItem>)}
      </TextField>
      <TextField type="date" size="small" label="Tuần bắt đầu" value={date} onChange={(event) => { setDate(event.target.value); setPlan([]); }} disabled={loading} slotProps={{ inputLabel: { shrink: true } }} />
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Button variant="contained" onClick={generate} disabled={loading || !date || !movieId} startIcon={loading ? <CircularProgress size={17} /> : <AutoAwesomeRoundedIcon />}>Đề xuất rạp, phòng và giờ chiếu</Button>
      {plan.length > 0 && <Button variant="outlined" color="inherit" onClick={() => setPlan([])}>Xóa bản nháp</Button>}
    </Stack>
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

    {!plan.length && !loading && <Box sx={{ py: 7, border: '1px dashed', borderColor: 'divider', borderRadius: 3, textAlign: 'center' }}>
      <Avatar sx={{ mx: 'auto', mb: 1.5, width: 58, height: 58, bgcolor: 'action.hover', color: 'primary.main' }}><CalendarMonthRoundedIcon /></Avatar>
      <Typography fontWeight={900}>Tạo lịch chiếu tối ưu cho tuần mới</Typography>
      <Typography variant="body2" color="text.secondary">AI cân bằng dự báo nhu cầu, phòng chiếu, thời lượng phim và các khung giờ không trùng nhau.</Typography>
    </Box>}

    {plan.length > 0 && <>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }} gap={1.5}>
        <Metric label="Suất được đề xuất" value={summary.showtimes} icon={CalendarMonthRoundedIcon} color="primary.main" />
        <Metric label="Rạp được chọn" value={summary.theaters} icon={MeetingRoomRoundedIcon} color="info.main" />
        <Metric label="Phòng được dùng" value={summary.rooms} icon={MovieRoundedIcon} color="warning.main" />
        <Metric label="Lấp đầy dự báo" value={`${summary.average}%`} icon={InsightsRoundedIcon} color="success.main" />
      </Box>
      <Alert severity="info">Bạn có thể loại từng suất chưa phù hợp trước khi xác nhận tạo lịch. Hệ thống vẫn kiểm tra trùng phòng khi áp dụng.</Alert>
      <Stack spacing={2}>{Object.entries(groupedPlan).map(([day, entries]) => <Card key={day} sx={panelSx}>
        <CardContent sx={{ p: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 1.75, bgcolor: 'action.hover' }}><Typography fontWeight={900}>{day}</Typography><Chip size="small" label={`${entries.length} suất`} /></Stack>
          <Divider />
          <Stack divider={<Divider flexItem />}>{entries.map((item) => <Stack key={`${item.online ? 'online' : item.cinemaRoomId}-${item.movieId}-${item.startTime}`} direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
            <Avatar sx={{ bgcolor: item.online ? 'rgba(56,189,248,.14)' : 'rgba(229,9,20,.14)', color: item.online ? 'info.main' : 'primary.main' }}>{item.online ? <OnlinePredictionRoundedIcon /> : <MovieRoundedIcon />}</Avatar>
            <Box flex={1} minWidth={0}><Typography fontWeight={850}>{item.movieTitle}</Typography><Typography variant="body2" color="text.secondary">{localDate(item.startTime)} · {item.theaterName} · {item.roomName}</Typography><Typography variant="caption" color="text.secondary">{item.reason}</Typography></Box>
            <Chip size="small" color={item.predictedOccupancyPercent >= 70 ? 'success' : 'warning'} label={`${item.predictedOccupancyPercent}% dự báo`} />
            <Tooltip title="Loại khỏi kế hoạch"><IconButton color="error" onClick={() => removeItem(item)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
          </Stack>)}</Stack>
        </CardContent>
      </Card>)}</Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={1.5}>
        <Button variant="outlined" onClick={generate} disabled={loading} startIcon={<RefreshRoundedIcon />}>Tạo lại đề xuất</Button>
        <Button variant="contained" color="success" onClick={() => setConfirmOpen(true)} disabled={loading || !plan.length} startIcon={<CheckCircleRoundedIcon />}>Xác nhận {plan.length} suất chiếu</Button>
      </Stack>
    </>}

    <Dialog open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={900}>Áp dụng kế hoạch tuần</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 0.5 }}><Alert severity="warning">Hệ thống sẽ tạo thật các suất chiếu trong danh sách. Phòng hoặc rạp ngừng hoạt động và các suất trùng phòng phát sinh sẽ được bỏ qua an toàn.</Alert><Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}><Typography fontWeight={850}>{plan.length} suất chiếu</Typography><Typography color="text.secondary">{summary.theaters} rạp · {summary.rooms} phòng · trung bình {summary.average}% lấp đầy dự báo</Typography></Box></Stack></DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setConfirmOpen(false)}>Kiểm tra lại</Button><Button variant="contained" color="success" disabled={loading} onClick={apply}>Tạo toàn bộ lịch</Button></DialogActions>
    </Dialog>
  </Stack>;
};
