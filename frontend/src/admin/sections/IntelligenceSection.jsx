import { useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SectionHeader from '../components/SectionHeader';
import { adminIntelligenceService } from '../../services/intelligenceService';

const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
const localDate = (date) =>
  new Date(date).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const localDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function IntelligenceSection({ rooms, movies, onShowtimesChanged }) {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <SectionHeader title="AI Cinema Intelligence" subtitle="Heatmap ghế · Giá động · Tạo lịch tuần" />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Bản đồ nhiệt ghế ngồi" />
        <Tab label="Giá Vé Động" />
        <Tab label="Trung tâm điều hành rạp chiếu" />
      </Tabs>
      {tab === 0 && <Heatmap rooms={rooms} />}
      {tab === 1 && <Pricing movies={movies} />}
      {tab === 2 && <WeeklyManager onApplied={onShowtimesChanged} />}
    </Box>
  );
}

const Heatmap = ({ rooms }) => {
  const [roomId, setRoomId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminIntelligenceService.heatmap(roomId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="Phòng chiếu" value={roomId} onChange={(e) => setRoomId(e.target.value)} sx={{ minWidth: 260 }}>
          {rooms.map((room) => (
            <MenuItem key={room.id} value={room.id}>
              {room.name}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" disabled={!roomId || loading} onClick={analyze} startIcon={<AutoAwesomeRoundedIcon />}>
          Phân tích
        </Button>
      </Stack>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <>
          <Alert severity="info">
            <b>{data.insight}</b>
            <br />
            {data.pricingSuggestion} · Mẫu: {data.sampleBookings} đơn
          </Alert>
          <Box className="admin-panel" sx={{ p: 3, overflowX: 'auto' }}>
            <Stack spacing={1}>
              {Object.entries(
                data.seats.reduce(
                  (rows, seat) => ({
                    ...rows,
                    [seat.row]: [...(rows[seat.row] || []), seat],
                  }),
                  {},
                ),
              ).map(([row, seats]) => (
                <Stack key={row} direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ width: 24 }}>{row}</Typography>
                  {seats.map((seat) => (
                    <Box
                      key={seat.seatId}
                      title={`${seat.label}: ${seat.selectedCount} lượt chọn`}
                      sx={{
                        width: 42,
                        height: 38,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 1.5,
                        bgcolor: `rgba(239,68,68,${Math.max(0.08, seat.heat / 100)})`,
                        border: '1px solid rgba(255,255,255,.12)',
                        fontSize: 12,
                      }}
                    >
                      {seat.label}
                    </Box>
                  ))}
                </Stack>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
};

const Pricing = ({ movies }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      setItems((await adminIntelligenceService.pricing()) || []);
    } finally {
      setLoading(false);
    }
  };
  const apply = async (item) => {
    await adminIntelligenceService.applyPricing(item.showtimeId, item.suggestedPrices);
    setNotice(`Đã áp dụng giá cho suất ${localDate(item.startTime)}`);
  };
  return (
    <Stack spacing={2}>
      <Button variant="contained" onClick={load} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
        Phân tích giá các suất sắp tới
      </Button>
      {loading && <CircularProgress />}
      {notice && <Alert severity="success">{notice}</Alert>}
      {items.map((item) => (
        <Box key={item.showtimeId} className="admin-panel" sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography fontWeight={800}>
                {movies.find((movie) => movie.id === item.movieId)?.title || 'Phim'} · {item.roomName}
              </Typography>
              <Typography color="text.secondary">
                {localDate(item.startTime)} · Đã bán {item.sold}/{item.capacity} ({item.occupancyPercent}%) · AI dự báo {item.predictedOccupancyPercent}%
              </Typography>
              <Chip size="small" color={item.multiplierPercent > 0 ? 'error' : item.multiplierPercent < 0 ? 'success' : 'default'} label={`${item.multiplierPercent >= 0 ? '+' : ''}${item.multiplierPercent}%`} sx={{ mt: 1 }} />
            </Box>
            <Stack alignItems={{ md: 'flex-end' }}>
              {Object.entries(item.suggestedPrices).map(([type, price]) => (
                <Typography key={type} variant="body2">
                  {type}: <b>{money(price)}</b>
                </Typography>
              ))}
              <Button size="small" variant="contained" onClick={() => apply(item)} sx={{ mt: 1 }}>
                Áp dụng giá
              </Button>
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

const WeeklyManager = ({ onApplied }) => {
  const nextMonday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return localDateInput(d);
  })();
  const [date, setDate] = useState(nextMonday);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const generate = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setNotice('');
    setError('');
    try {
      setPlan((await adminIntelligenceService.weeklyPlan(date)) || []);
    } catch (err) {
      setError(err.message);
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
      setNotice(`Đã tạo ${count} suất chiếu`);
      setPlan([]);
      await onApplied?.();
    } catch (err) {
      setError(err.message);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <TextField type="date" label="Tuần bắt đầu" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={generate} disabled={loading}>
          Tạo lịch bằng AI
        </Button>
      </Stack>
      {loading && <CircularProgress />}
      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {plan.length > 0 && (
        <>
          <Alert severity="info">AI đề xuất {plan.length} suất, đã loại các phòng trùng lịch.</Alert>
          {plan.map((item, index) => (
            <Box key={`${item.cinemaRoomId}-${item.startTime}`} className="admin-panel" sx={{ p: 2 }}>
              <Typography fontWeight={800}>
                #{index + 1} {item.movieTitle} · {item.roomName}
              </Typography>
              <Typography variant="body2">
                {localDate(item.startTime)} · Dự kiến {item.predictedOccupancyPercent}% lấp đầy
              </Typography>
            </Box>
          ))}
          <Button variant="contained" color="success" onClick={apply} disabled={loading}>
            {loading ? 'Đang tạo lịch...' : 'Xác nhận tạo toàn bộ lịch'}
          </Button>
        </>
      )}
    </Stack>
  );
};
