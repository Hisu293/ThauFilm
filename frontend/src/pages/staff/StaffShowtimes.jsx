import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Switch,
  Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { staffShowtimeService, fromUTCToLocal } from '../../services/staffShowtimeService';
import {
  SHOWTIME_STATUS,
  SHOWTIME_STATUS_OPTIONS,
  SEAT_BOOKING_STATUS,
  enumLabel,
} from '../../constants/enums';
import useStaffList from '../../hooks/useStaffList';

const SHOWTIME_DATE_FIELDS = ['createdAt', 'updatedAt', 'startTime'];
const matchesShowtimeSearch = (showtime, query) =>
  [showtime.movieTitle, showtime.cinemaRoomName, showtime.roomName, showtime.theaterName, showtime.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const emptyForm = { movieId: '', cinemaRoomId: '', startTime: '', endTime: '', status: 'SCHEDULED', online: false, mystery: false, mysteryUnlockAt: '' };

const STATUS_COLOR = {
  SCHEDULED: 'default',
  OPEN: 'success',
  RUNNING: 'info',
  COMPLETED: 'default',
  CANCELLED: 'error',
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const StaffShowtimes = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // dialog form: { mode: 'add' | 'edit', id? }
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // dialog ghế
  const [seatDialog, setSeatDialog] = useState(null); // showtime đang xem ghế
  const [seatMap, setSeatMap] = useState(null);
  const [seatLoading, setSeatLoading] = useState(false);

  // xóa
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, mv, rm, th] = await Promise.all([
        staffShowtimeService.list(),
        staffShowtimeService.getMovies(),
        staffShowtimeService.getRooms(),
        staffShowtimeService.getTheaters(),
      ]);
      setShowtimes(Array.isArray(list) ? list : []);
      setMovies(mv || []);
      setRooms(rm || []);
      setTheaters(th || []);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu suất chiếu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const theaterName = (id) => theaters.find((t) => t.id === id)?.name || '';
  const roomLabel = (room) => `${room.name} — ${theaterName(room.theaterId)}`;

  // Backend không trả theaterName cho suất chiếu (luôn null), nên suy ra từ
  // cinemaRoomId → room.theaterId → theater.name bằng dữ liệu đã load sẵn.
  const roomById = (id) => rooms.find((r) => r.id === id);
  const showtimeRoomName = (s) => s.online ? 'Xem online' : (s.cinemaRoomName || roomById(s.cinemaRoomId)?.name || '—');
  const showtimeTheaterName = (s) => {
    if (s.online) return 'Online';
    if (s.theaterName) return s.theaterName;
    const room = roomById(s.cinemaRoomId);
    return room ? theaterName(room.theaterId) || '—' : '—';
  };

  const openAdd = () => {
    setForm({ ...emptyForm, movieId: movies[0]?.id || '', cinemaRoomId: rooms[0]?.id || '' });
    setFormError('');
    setDialog({ mode: 'add' });
  };

  const openEdit = (s) => {
    setForm({
      movieId: s.movieId || '',
      cinemaRoomId: s.cinemaRoomId || '',
      startTime: fromUTCToLocal(s.startTime),
      endTime: fromUTCToLocal(s.endTime),
      status: s.status || 'SCHEDULED',
      online: Boolean(s.online),
      mystery: Boolean(s.mystery),
      mysteryUnlockAt: fromUTCToLocal(s.mysteryUnlockAt),
    });
    setFormError('');
    setDialog({ mode: 'edit', id: s.id });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.movieId || (!form.online && !form.cinemaRoomId) || !form.startTime || !form.endTime) {
      setFormError('Vui lòng chọn đầy đủ phim, phòng chiếu, giờ bắt đầu và giờ kết thúc.');
      return;
    }
    if (new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()) {
      setFormError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    setSaving(true);
    try {
      if (dialog.mode === 'add') {
        const created = await staffShowtimeService.create(form);
        setShowtimes((list) => [...list, created]);
        setToast({ severity: 'success', message: 'Tạo suất chiếu thành công.' });
      } else {
        const updated = await staffShowtimeService.update(dialog.id, form);
        setShowtimes((list) => list.map((s) => (s.id === updated.id ? updated : s)));
        setToast({ severity: 'success', message: 'Cập nhật suất chiếu thành công.' });
      }
      setDialog(null);
    } catch (err) {
      setFormError(err.message || 'Không thể lưu suất chiếu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await staffShowtimeService.remove(target.id);
      setShowtimes((list) => list.filter((s) => s.id !== target.id));
      setToast({ severity: 'success', message: 'Đã hủy suất chiếu.' });
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Hủy suất chiếu thất bại.' });
    }
  };

  const openSeats = async (s) => {
    setSeatDialog(s);
    setSeatMap(null);
    setSeatLoading(true);
    try {
      const data = await staffShowtimeService.getSeats(s.id);
      setSeatMap(data || null);
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Không tải được sơ đồ ghế.' });
    } finally {
      setSeatLoading(false);
    }
  };

  const {
    search,
    page,
    setPage,
    handleSearchChange,
    filteredItems,
    paginatedItems,
    rowsPerPage,
  } = useStaffList({
    items: showtimes,
    matchesSearch: matchesShowtimeSearch,
    dateFields: SHOWTIME_DATE_FIELDS,
  });

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleRoundedIcon color="primary" /> Quản lý suất chiếu
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Tạo suất, cập nhật giờ chiếu, phân phòng, theo dõi ghế và vé đã bán.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd} disabled={loading || !!error}>
          Tạo suất chiếu
        </Button>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Tìm theo phim, phòng, rạp hoặc trạng thái…"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 280 } }}
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button variant="outlined" onClick={loadAll}>Thử lại</Button>
            </Box>
          ) : filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              {search ? 'Không có suất chiếu nào phù hợp.' : 'Chưa có suất chiếu nào. Nhấn "Tạo suất chiếu" để thêm mới.'}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Phim</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phòng / Rạp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Bắt đầu</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Kết thúc</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedItems.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{s.movieTitle || '—'}</Typography>
                        {s.mystery ? (
                          <Typography variant="caption" color="warning.main" display="block">
                            Mystery Movie Night
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{showtimeRoomName(s)}</Typography>
                        <Typography variant="caption" color="text.secondary">{showtimeTheaterName(s)}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{formatDateTime(s.startTime)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{formatDateTime(s.endTime)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={enumLabel(SHOWTIME_STATUS, s.status)}
                          color={STATUS_COLOR[s.status] || 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Tình trạng ghế & vé đã bán">
                          <IconButton size="small" onClick={() => openSeats(s)} disabled={Boolean(s.online)}>
                            <EventSeatRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sửa">
                          <IconButton size="small" color="primary" onClick={() => openEdit(s)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hủy suất">
                          <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => setDeleteTarget(s)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loading && !error && filteredItems.length > 0 && (
            <TablePagination
              component="div"
              count={filteredItems.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog tạo / sửa */}
      <Dialog open={!!dialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialog?.mode === 'add' ? 'Tạo suất chiếu' : 'Cập nhật suất chiếu'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              select
              label="Phim"
              fullWidth
              value={form.movieId}
              onChange={(e) => setForm({ ...form, movieId: e.target.value })}
            >
              {movies.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.online)}
                  onChange={(e) => setForm({
                    ...form,
                    online: e.target.checked,
                    cinemaRoomId: e.target.checked ? '' : (form.cinemaRoomId || rooms[0]?.id || ''),
                  })}
                />
              }
              label="Suất chiếu online"
            />
            <TextField
              select
              label="Phòng chiếu"
              fullWidth
              disabled={Boolean(form.online)}
              helperText={form.online ? 'Suất online không cần chọn rạp/phòng.' : ''}
              value={form.cinemaRoomId}
              onChange={(e) => setForm({ ...form, cinemaRoomId: e.target.value })}
            >
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>{roomLabel(r)}</MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Giờ bắt đầu"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <TextField
                label="Giờ kết thúc"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </Stack>
            <TextField
              select
              label="Trạng thái"
              fullWidth
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {SHOWTIME_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.mystery)}
                  onChange={(e) => setForm({
                    ...form,
                    mystery: e.target.checked,
                    mysteryUnlockAt: e.target.checked ? form.mysteryUnlockAt : '',
                  })}
                />
              }
              label="Mystery Movie Night"
            />
            {form.mystery ? (
              <TextField
                label="Mở khóa tên phim lúc"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.mysteryUnlockAt}
                onChange={(e) => setForm({ ...form, mysteryUnlockAt: e.target.value })}
                helperText="Trước thời điểm này khách chỉ thấy Mystery Movie Night."
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? 'Đang lưu…' : dialog?.mode === 'add' ? 'Tạo' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog sơ đồ ghế */}
      <Dialog open={!!seatDialog} onClose={() => setSeatDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Tình trạng ghế — {seatDialog?.movieTitle}
          <Typography variant="caption" display="block" color="text.secondary">
            {seatDialog?.cinemaRoomName} · {formatDateTime(seatDialog?.startTime)}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {seatLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : seatMap ? (
            <SeatMapView seatMap={seatMap} />
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Không có dữ liệu ghế.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSeatDialog(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Xác nhận hủy */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Hủy suất chiếu?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn chắc chắn muốn hủy suất chiếu <b>{deleteTarget?.movieTitle}</b> lúc{' '}
            <b>{formatDateTime(deleteTarget?.startTime)}</b>? Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Đóng</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Hủy suất</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
};

// ─── Sơ đồ ghế + thống kê vé đã bán ───────────────────────────────────────────
const SEAT_TILE_COLOR = {
  AVAILABLE: '#475569',
  HOLDING: '#f59e0b',
  BOOKED: '#3b82f6',
  SOLD: '#22c55e',
};

const SeatMapView = ({ seatMap }) => {
  const { seats = [], rows = [], totalSeats = 0, soldSeats = 0 } = seatMap;
  const seatsByRow = rows.map((rowName) => ({
    rowName,
    seats: seats
      .filter((s) => s.rowName === rowName)
      .sort((a, b) => (Number(a.seatNumber) || 0) - (Number(b.seatNumber) || 0)),
  }));
  const soldPct = totalSeats ? Math.round((soldSeats / totalSeats) * 100) : 0;

  return (
    <Box>
      {/* Thống kê vé đã bán */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <StatBox label="Tổng ghế" value={totalSeats} />
        <StatBox label="Vé đã bán" value={soldSeats} color="#22c55e" />
        <StatBox label="Còn trống" value={totalSeats - soldSeats} color="#475569" />
      </Stack>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Tỷ lệ lấp đầy</Typography>
          <Typography variant="caption" fontWeight={700}>{soldPct}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={soldPct} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      {/* Màn hình */}
      <Box sx={{ maxWidth: 560, mx: 'auto', mb: 2 }}>
        <Box
          sx={{
            height: 18,
            borderRadius: '50% 50% 6px 6px / 100% 100% 6px 6px',
            background: 'linear-gradient(180deg, rgba(229,9,20,0.45), rgba(229,9,20,0))',
          }}
        />
        <Typography align="center" sx={{ mt: 0.5, fontSize: '0.7rem', letterSpacing: '0.3em', color: 'text.secondary' }}>
          MÀN HÌNH
        </Typography>
      </Box>

      {/* Lưới ghế */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, alignItems: 'center' }}>
        {seatsByRow.map(({ rowName, seats: rowSeats }) => (
          <Stack key={rowName} direction="row" spacing={0.6} alignItems="center">
            <Box sx={{ width: 16, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>
              {rowName}
            </Box>
            {rowSeats.map((seat) => (
              <Tooltip key={seat.id} title={`${seat.label} · ${enumLabel(SEAT_BOOKING_STATUS, seat.status)}`}>
                <Box
                  sx={{
                    width: 24,
                    height: 22,
                    borderRadius: '5px 5px 2px 2px',
                    bgcolor: SEAT_TILE_COLOR[seat.status] || SEAT_TILE_COLOR.AVAILABLE,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.58rem',
                    fontWeight: 600,
                  }}
                >
                  {seat.seatNumber}
                </Box>
              </Tooltip>
            ))}
          </Stack>
        ))}
      </Box>

      {/* Chú thích */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
        {Object.values(SEAT_BOOKING_STATUS).map((s) => (
          <Stack key={s.value} direction="row" spacing={0.6} alignItems="center">
            <Box sx={{ width: 16, height: 14, borderRadius: '4px 4px 1px 1px', bgcolor: SEAT_TILE_COLOR[s.value] }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

const StatBox = ({ label, value, color }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 120,
      p: 1.5,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      textAlign: 'center',
    }}
  >
    <Typography variant="h5" sx={{ fontWeight: 800, color: color || 'text.primary' }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
);

export default StaffShowtimes;
