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
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MovieFilterRoundedIcon from '@mui/icons-material/MovieFilterRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { staffMovieService } from '../../services/staffMovieService';

// Nhãn tiếng Việt + màu cho trạng thái phát hành
const STATUS_META = {
  NOW_SHOWING: { label: 'Đang chiếu', color: 'success' },
  COMING_SOON: { label: 'Sắp chiếu', color: 'info' },
  STOPPED: { label: 'Ngừng chiếu', color: 'default' },
};
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));

const RATED_OPTIONS = ['P', 'K', 'T13', 'T16', 'T18', 'C'];

const emptyForm = {
  title: '',
  description: '',
  durationMinutes: '',
  rating: '',
  active: true,
  posterUrl: '',
  trailerUrl: '',
  director: '',
  actors: '',
  genre: '',
  releaseDate: '',
  language: '',
  rated: '',
  streamProvider: 'S3',
  streamKey: '',
  status: 'NOW_SHOWING',
};

const StaffMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // dialog: { mode: 'view' | 'edit', movie }
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffMovieService.list();
      setMovies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách phim.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovies();
  }, [loadMovies]);

  const openView = async (movie) => {
    // Lấy chi tiết mới nhất từ API (GET /api/staff/movies/{id})
    setDialog({ mode: 'view', movie });
    try {
      const fresh = await staffMovieService.getById(movie.id);
      if (fresh) setDialog({ mode: 'view', movie: fresh });
    } catch {
      /* giữ dữ liệu đã có nếu lỗi */
    }
  };

  const openEdit = (movie) => {
    setForm({ ...emptyForm, ...movie });
    setDialog({ mode: 'edit', movie });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await staffMovieService.update(dialog.movie.id, form);
      setMovies((list) => list.map((m) => (m.id === updated.id ? updated : m)));
      setToast({ severity: 'success', message: 'Cập nhật phim thành công.' });
      setDialog(null);
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Cập nhật thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? movies.filter((m) =>
        [m.title, m.director, m.actors, m.genre].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      )
    : movies;

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MovieFilterRoundedIcon color="primary" /> Quản lý phim
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Xem danh sách, cập nhật poster, trailer, mô tả và lịch phát hành phim.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Tìm theo tên, đạo diễn, diễn viên…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
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
              <Button variant="outlined" onClick={loadMovies}>Thử lại</Button>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              Không có phim nào khớp.
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Phim</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Thể loại</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Thời lượng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ngày phát hành</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((m) => {
                    const meta = STATUS_META[m.status] || { label: m.status, color: 'default' };
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              variant="rounded"
                              src={m.posterUrl || undefined}
                              sx={{ width: 40, height: 56, bgcolor: 'action.hover' }}
                            >
                              <MovieFilterRoundedIcon fontSize="small" />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>{m.title}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {m.director || '—'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{m.genre || '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {m.durationMinutes ? `${m.durationMinutes} phút` : '—'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{m.releaseDate || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openView(m)} title="Xem chi tiết">
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={() => openEdit(m)} title="Cập nhật">
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog xem chi tiết */}
      <Dialog open={dialog?.mode === 'view'} onClose={closeDialog} maxWidth="sm" fullWidth>
        {dialog?.mode === 'view' && <MovieDetail movie={dialog.movie} onEdit={() => openEdit(dialog.movie)} onClose={closeDialog} />}
      </Dialog>

      {/* Dialog cập nhật */}
      <Dialog open={dialog?.mode === 'edit'} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Cập nhật phim — {dialog?.movie?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField label="Tên phim" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField
              label="Mô tả phim"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Poster URL"
                fullWidth
                value={form.posterUrl}
                onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
              />
              {form.posterUrl ? (
                <Avatar variant="rounded" src={form.posterUrl} sx={{ width: 48, height: 64 }} />
              ) : null}
            </Stack>

            <TextField
              label="Trailer URL"
              fullWidth
              placeholder="https://youtube.com/..."
              value={form.trailerUrl}
              onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })}
              InputProps={{
                endAdornment: form.trailerUrl ? (
                  <InputAdornment position="end">
                    <IconButton size="small" component="a" href={form.trailerUrl} target="_blank" rel="noopener">
                      <OpenInNewRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Stream provider"
                fullWidth
                value={form.streamProvider || 'S3'}
                onChange={(e) => setForm({ ...form, streamProvider: e.target.value })}
              />
              <TextField
                label="S3 object key"
                fullWidth
                placeholder="movies/example/master.m3u8"
                value={form.streamKey || ''}
                onChange={(e) => setForm({ ...form, streamKey: e.target.value })}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Đạo diễn" fullWidth value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} />
              <TextField label="Diễn viên" fullWidth value={form.actors} onChange={(e) => setForm({ ...form, actors: e.target.value })} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Thể loại" fullWidth value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
              <TextField label="Ngôn ngữ" fullWidth value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Thời lượng (phút)"
                type="number"
                fullWidth
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
              <TextField
                label="Điểm đánh giá"
                type="number"
                fullWidth
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
              <TextField select label="Giới hạn tuổi" fullWidth value={form.rated || ''} onChange={(e) => setForm({ ...form, rated: e.target.value })}>
                {RATED_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Ngày phát hành"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.releaseDate || ''}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
              />
              <TextField select label="Trạng thái" fullWidth value={form.status || 'NOW_SHOWING'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <FormControlLabel
              control={<Switch checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
              label="Đang hoạt động (hiển thị cho khách)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
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

// ─── Khối chi tiết phim (chỉ xem) ──────────────────────────────────────────────
const DetailRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value || '—'}</Typography>
  </Stack>
);

const MovieDetail = ({ movie, onEdit, onClose }) => {
  const meta = STATUS_META[movie.status] || { label: movie.status, color: 'default' };

  return (
    <>
      <DialogTitle sx={{ fontWeight: 800 }}>{movie.title}</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Avatar
            variant="rounded"
            src={movie.posterUrl || undefined}
            sx={{ width: 120, height: 168, bgcolor: 'action.hover', flexShrink: 0 }}
          >
            <MovieFilterRoundedIcon />
          </Avatar>
          <Stack spacing={1.2} sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 700 }} />
              {movie.rated ? <Chip size="small" variant="outlined" label={movie.rated} /> : null}
              {movie.rating ? <Chip size="small" variant="outlined" label={`★ ${movie.rating}`} /> : null}
            </Stack>
            <DetailRow label="Đạo diễn" value={movie.director} />
            <DetailRow label="Diễn viên" value={movie.actors} />
            <DetailRow label="Thể loại" value={movie.genre} />
            <DetailRow label="Thời lượng" value={movie.durationMinutes ? `${movie.durationMinutes} phút` : ''} />
            <DetailRow label="Ngôn ngữ" value={movie.language} />
            <DetailRow label="Ngày phát hành" value={movie.releaseDate} />
            <DetailRow label="Stream" value={movie.streamKey ? `${movie.streamProvider || 'S3'} / ${movie.streamKey}` : ''} />
            {movie.trailerUrl ? (
              <Button
                size="small"
                variant="outlined"
                component="a"
                href={movie.trailerUrl}
                target="_blank"
                rel="noopener"
                startIcon={<OpenInNewRoundedIcon />}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              >
                Xem trailer
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Mô tả</Typography>
        <Typography variant="body2" color="text.secondary">{movie.description || 'Chưa có mô tả.'}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Đóng</Button>
        <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={onEdit}>Cập nhật</Button>
      </DialogActions>
    </>
  );
};

export default StaffMovies;
