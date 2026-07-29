import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import RestoreFromTrashRoundedIcon from '@mui/icons-material/RestoreFromTrashRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import SectionHeader from '../components/SectionHeader';
import StatusChip from '../components/StatusChip';
import UploadFile from '../../components/UploadFile';

const emptyMovie = {
  title: '',
  description: '',
  durationMinutes: 120,
  rating: 0,
  active: true,
  posterUrl: '',
  heroBannerUrl: '',
  trailerUrl: '',
  director: '',
  actors: '',
  genre: '',
  releaseDate: '',
  language: '',
  rated: '',
  streamProvider: 'S3',
  streamKey: '',
  streamFileName: '',
  status: 'NOW_SHOWING',
};
const emptyGenre = { name: '', slug: '' };
const emptyActor = { name: '', nationality: 'Việt Nam' };

const MOVIE_STATUSES = [
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'STOPPED', label: 'Ngừng chiếu' },
];

export const MoviesSection = ({ crud, genres = [] }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyMovie);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [streamUploading, setStreamUploading] = useState(false);
  const [streamUploadProgress, setStreamUploadProgress] = useState(0);

  // ── Bộ lọc ──
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState(''); // '' | 'active' | 'hidden'

  const genreOptions = useMemo(() => {
    const configured = genres
      .filter((genre) => genre.name || genre.slug)
      .map((genre) => ({ value: genre.slug || genre.name, label: genre.slug ? `${genre.name} (${genre.slug})` : genre.name }));
    const knownValues = new Set(configured.map((genre) => genre.value));
    const existing = crud.list
      .map((movie) => movie.genre)
      .filter((genre) => genre && !knownValues.has(genre))
      .map((genre) => ({ value: genre, label: genre }));
    return [...configured, ...existing];
  }, [crud.list, genres]);

  const filtered = useMemo(
    () =>
      crud.list.filter((m) => {
        if (search && !m.title?.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (genreFilter && m.genre !== genreFilter) return false;
        if (statusFilter && m.status !== statusFilter) return false;
        if (activeFilter === 'active' && m.active === false) return false;
        if (activeFilter === 'hidden' && m.active !== false) return false;
        return true;
      }),
    [crud.list, search, genreFilter, statusFilter, activeFilter]
  );

  const hasFilter = search || genreFilter || statusFilter || activeFilter;
  const clearFilters = () => {
    setSearch('');
    setGenreFilter('');
    setStatusFilter('');
    setActiveFilter('');
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectStreamFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && (!file.type.startsWith('video/') || file.size > 500 * 1024 * 1024)) {
      setFormError('Chỉ nhận file video tối đa 500MB.');
      event.target.value = '';
      return;
    }
    setFormError(null);
    if (!file) return;
    setStreamUploading(true);
    setStreamUploadProgress(0);
    crud.uploadStreamFile(file, setStreamUploadProgress)
      .then((streamKey) => {
        setForm((current) => ({
          ...current,
          streamKey,
          streamProvider: 'S3',
          streamFileName: file.name,
        }));
      })
      .catch((err) => setFormError(err.message || 'Upload phim lên S3 thất bại'))
      .finally(() => {
        setStreamUploading(false);
        event.target.value = '';
      });
  };

  const openAdd = () => {
    setForm(emptyMovie);
    setFormError(null);
    setDialog('add');
  };
  // Sửa: gọi API GET /api/admin/movies/{id} để lấy dữ liệu mới nhất rồi mở form
  const openEdit = async (row) => {
    setEditLoadingId(row.id);
    try {
      const detail = await crud.getById(row.id);
      const movie = detail || row;
      setForm({ ...emptyMovie, ...movie, trailerUrl: movie?.trailerKey || movie?.trailerUrl || '' });
      setFormError(null);
      setDialog(row.id);
    } catch (err) {
      window.alert(err.message || 'Không tải được chi tiết phim');
    } finally {
      setEditLoadingId(null);
    }
  };
  const save = async () => {
    if (streamUploading) {
      setFormError('Vui lòng chờ upload phim lên S3 hoàn tất trước khi lưu.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (dialog === 'add') await crud.add(form);
      else await crud.update(dialog, form);
      setDialog(null);
      // Force reload danh sách phim sau khi lưu
      await crud.reload();
    } catch (err) {
      setFormError(err.message || 'Lưu phim thất bại');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Ẩn phim này? (xóa mềm — chỉ chuyển trạng thái, không xóa khỏi hệ thống)')) return;
    try {
      await crud.remove(id);
    } catch (err) {
      window.alert(err.message || 'Ẩn phim thất bại');
    }
  };
  const handleRestore = async (id) => {
    try {
      await crud.restore(id);
    } catch (err) {
      window.alert(err.message || 'Khôi phục phim thất bại');
    }
  };

  return (
    <>
      <SectionHeader title="Quản lý phim" subtitle="Thêm · Sửa · Xóa phim" onAction={openAdd} actionLabel="Thêm phim" />
      {crud.error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={crud.reload}>Thử lại</Button>}>
          {crud.error}
        </Alert>
      )}

      {/* Bộ lọc danh sách phim */}
      <Box
        className="admin-panel admin-animate-in"
        sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}
      >
        <TextField
          size="small"
          placeholder="Tìm theo tên phim…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" label="Thể loại" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Tất cả thể loại</MenuItem>
          {genreOptions.map((genre) => (
            <MenuItem key={genre.value} value={genre.value}>
              {genre.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          {MOVIE_STATUSES.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Hiển thị" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="active">Đang hiện</MenuItem>
          <MenuItem value="hidden">Đã ẩn</MenuItem>
        </TextField>
        {hasFilter && (
          <Button size="small" color="inherit" startIcon={<FilterAltOffRoundedIcon />} onClick={clearFilters}>
            Xóa lọc
          </Button>
        )}
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', ml: 'auto' }}>
          {filtered.length}/{crud.list.length} phim
        </Typography>
      </Box>

      <Box className="admin-panel admin-animate-in" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Tên phim</TableCell>
                <TableCell sx={thSx}>Thể loại</TableCell>
                <TableCell sx={thSx}>Thời lượng</TableCell>
                <TableCell sx={thSx}>Đánh giá</TableCell>
                <TableCell sx={thSx}>Trạng thái</TableCell>
                <TableCell align="right" sx={thSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {crud.loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!crud.loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'rgba(255,255,255,0.4)' }}>
                    {crud.list.length === 0 ? 'Chưa có phim nào' : 'Không có phim khớp bộ lọc'}
                  </TableCell>
                </TableRow>
              )}
              {!crud.loading &&
                filtered.map((m) => (
                  <TableRow key={m.id} className="admin-table-row" sx={{ opacity: m.active === false ? 0.5 : 1 }}>
                    <TableCell>
                      <Typography fontWeight={600}>{m.title}</Typography>
                    </TableCell>
                    <TableCell>{m.genre}</TableCell>
                    <TableCell>{m.durationMinutes} phút</TableCell>
                    <TableCell>{m.rating != null ? `${m.rating}/10` : '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <StatusChip status={m.status} />
                        {m.active === false && <StatusChip status="hidden" label="Đã ẩn" />}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openEdit(m)}
                        disabled={editLoadingId === m.id}
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                        title="Sửa"
                      >
                        {editLoadingId === m.id ? <CircularProgress size={16} /> : <EditRoundedIcon fontSize="small" />}
                      </IconButton>
                      {m.active === false ? (
                        <IconButton size="small" onClick={() => handleRestore(m.id)} sx={{ color: '#4ade80' }} title="Khôi phục">
                          <RestoreFromTrashRoundedIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton size="small" onClick={() => handleDelete(m.id)} sx={{ color: '#f87171' }} title="Ẩn phim (xóa mềm)">
                          <VisibilityOffRoundedIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <EntityDialog
        open={!!dialog}
        title={dialog === 'add' ? 'Thêm phim' : 'Sửa phim'}
        onClose={() => setDialog(null)}
        onSave={save}
        saving={saving || streamUploading}
      >
        {formError && <Alert severity="error" sx={{ mb: 1 }}>{formError}</Alert>}
        <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Thông tin cơ bản</Typography>
          <Stack spacing={2}>
            <TextField label="Tên phim" fullWidth value={form.title} onChange={set('title')} />
            <TextField label="Mô tả" fullWidth multiline minRows={3} value={form.description} onChange={set('description')} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField select label="Thể loại" value={form.genre} onChange={set('genre')}>
                <MenuItem value="">Chọn thể loại</MenuItem>
                {genreOptions.map((genre) => <MenuItem key={genre.value} value={genre.value}>{genre.label}</MenuItem>)}
              </TextField>
              <TextField label="Đạo diễn" value={form.director} onChange={set('director')} />
            </Box>
            <TextField label="Diễn viên" fullWidth value={form.actors} onChange={set('actors')} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Thời lượng (phút)" type="number" value={form.durationMinutes} onChange={set('durationMinutes')} />
              <TextField label="Đánh giá (0-10)" type="number" inputProps={{ min: 0, max: 10 }} value={form.rating} onChange={set('rating')} />
              <TextField label="Ngôn ngữ" value={form.language} onChange={set('language')} />
              <TextField label="Phân loại (rated)" value={form.rated} onChange={set('rated')} placeholder="VD: PG-13" />
              <TextField label="Ngày phát hành" type="date" value={form.releaseDate || ''} onChange={set('releaseDate')} InputLabelProps={{ shrink: true }} />
              <TextField select label="Trạng thái" value={form.status} onChange={set('status')}>
                {MOVIE_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Box>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(229,9,20,0.05)', border: '1px solid rgba(229,9,20,0.18)' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Ảnh và trailer</Typography>
          <Stack spacing={2}>
        <UploadFile
          label="Chọn poster để upload lên S3"
          folder="posters"
          value={form.posterUrl || ''}
          accept="image/jpeg,image/png,image/webp"
          onChange={(fileUrl) => setForm((current) => ({ ...current, posterUrl: fileUrl }))}
        />
        <UploadFile
          label="Chọn ảnh hero/banner ngang để upload lên S3"
          folder="hero-banners"
          value={form.heroBannerUrl || ''}
          accept="image/jpeg,image/png,image/webp"
          previewSx={{ width: '100%', maxWidth: 520, height: 190, objectFit: 'cover' }}
          onChange={(fileUrl) => setForm((current) => ({ ...current, heroBannerUrl: fileUrl }))}
        />
        <Typography variant="caption" color="text.secondary">
          Ảnh hero hiển thị ở banner đầu trang chủ. Khuyến nghị tỷ lệ 16:9, tối thiểu 1600 × 900 px.
        </Typography>
        <UploadFile
          label="Chọn trailer MP4/MOV để upload lên S3"
          folder="trailers"
          value={form.trailerUrl || ''}
          accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={(fileUrl) => setForm((current) => ({ ...current, trailerUrl: fileUrl }))}
        />
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Phim online</Typography>
          <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField label="Stream provider" value={form.streamProvider || 'S3'} onChange={set('streamProvider')} sx={{ flex: 1 }} />
          <TextField
            label="S3 object key"
            value={form.streamKey || ''}
            onChange={set('streamKey')}
            sx={{ flex: 2 }}
            placeholder="movies/example/master.m3u8"
          />
        </Stack>
        <Button variant="outlined" component="label" disabled={streamUploading} startIcon={streamUploading ? <CircularProgress size={18} /> : <CloudUploadRoundedIcon />} sx={{ justifyContent: 'flex-start' }}>
          {streamUploading ? `Đang upload phim lên S3... ${streamUploadProgress}%` : form.streamFileName ? `Đã upload: ${form.streamFileName}` : 'Chọn file phim để upload lên S3'}
          <input
            hidden
            type="file"
            accept="video/mp4,video/webm,video/*"
            onChange={selectStreamFile}
          />
        </Button>
        <Typography variant="caption" color="text.secondary">
          File sẽ được upload trực tiếp lên S3 ngay khi chọn. Khuyến nghị MP4/WebM, tối đa 500MB.
        </Typography>
          </Stack>
        </Box>
        <FormControlLabel
          control={<Switch checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />}
          label="Kích hoạt (active)"
          sx={{ mt: 1 }}
        />
      </EntityDialog>
    </>
  );
};

export const GenresSection = ({ crud }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyGenre);

  const save = () => {
    if (dialog === 'add') crud.add(form);
    else crud.update(dialog, form);
    setDialog(null);
  };

  return (
    <>
      <SectionHeader title="Quản lý thể loại" subtitle="CRUD thể loại phim" onAction={() => { setForm(emptyGenre); setDialog('add'); }} actionLabel="Thêm thể loại" />
      <Box className="admin-panel admin-animate-in">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Tên</TableCell>
                <TableCell sx={thSx}>Slug</TableCell>
                <TableCell sx={thSx}>Số phim</TableCell>
                <TableCell align="right" sx={thSx} />
              </TableRow>
            </TableHead>
            <TableBody>
              {crud.list.map((g) => (
                <TableRow key={g.id} className="admin-table-row">
                  <TableCell>
                    <Typography fontWeight={600}>{g.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                      {g.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>{g.movieCount}</TableCell>
                  <TableCell align="right">
                    <ActionBtns onEdit={() => { setForm(g); setDialog(g.id); }} onDelete={() => crud.remove(g.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <EntityDialog open={!!dialog} title={dialog === 'add' ? 'Thêm thể loại' : 'Sửa thể loại'} onClose={() => setDialog(null)} onSave={save}>
        <TextField label="Tên thể loại" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Slug" fullWidth value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      </EntityDialog>
    </>
  );
};

export const ActorsSection = ({ crud }) => {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyActor);

  const save = () => {
    if (dialog === 'add') crud.add(form);
    else crud.update(dialog, form);
    setDialog(null);
  };

  return (
    <>
      <SectionHeader title="Quản lý diễn viên" subtitle="CRUD diễn viên" onAction={() => { setForm(emptyActor); setDialog('add'); }} actionLabel="Thêm diễn viên" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        {crud.list.map((a) => (
          <Box key={a.id} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': '#6366f1' }}>
            <Typography variant="h6" fontWeight={700}>
              {a.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {a.nationality}
            </Typography>
            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'rgba(255,255,255,0.45)' }}>
              {a.movieCount} phim
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => { setForm(a); setDialog(a.id); }}>
                Sửa
              </Button>
              <Button size="small" color="error" startIcon={<DeleteRoundedIcon />} onClick={() => crud.remove(a.id)}>
                Xóa
              </Button>
            </Stack>
          </Box>
        ))}
      </Box>
      <EntityDialog open={!!dialog} title={dialog === 'add' ? 'Thêm diễn viên' : 'Sửa diễn viên'} onClose={() => setDialog(null)} onSave={save}>
        <TextField label="Họ tên" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Quốc tịch" fullWidth value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
      </EntityDialog>
    </>
  );
};

export const TrailersSection = ({ crud, movies }) => {
  const handleUpload = (t) => {
    const name = `${t.movieTitle?.toLowerCase().replace(/\s/g, '-')}-trailer.mp4`;
    crud.upload(t.movieId, name);
  };

  return (
    <>
      <SectionHeader title="Quản lý trailer" subtitle="Upload trailer cho từng phim" actionLabel="Gán phim mới" onAction={() => crud.linkMovie(movies[0]?.id, movies[0]?.title)} />
      <Box sx={{ display: 'grid', gap: 2 }}>
        {crud.list.map((t) => (
          <Box key={t.id} className="admin-panel admin-animate-in" sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 68,
                borderRadius: 2,
                bgcolor: 'rgba(229,9,20,0.15)',
                border: '1px dashed rgba(229,9,20,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudUploadRoundedIcon sx={{ color: '#e50914', opacity: 0.8 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography fontWeight={700}>{t.movieTitle}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t.fileName || 'Chưa có file trailer'}
                {t.size ? ` · ${t.size}` : ''}
              </Typography>
            </Box>
            <StatusChip status={t.status} />
            <Button variant="contained" component="label" disabled={t.status === 'ready'} onClick={() => handleUpload(t)} sx={{ fontWeight: 600 }}>
              Upload trailer
              <input type="file" hidden accept="video/*" onChange={() => handleUpload(t)} />
            </Button>
          </Box>
        ))}
      </Box>
      <Box className="admin-upload-zone admin-animate-in" sx={{ mt: 2 }}>
        <CloudUploadRoundedIcon sx={{ fontSize: 40, color: '#e50914', mb: 1 }} />
        <Typography fontWeight={600}>Kéo thả file trailer vào đây</Typography>
        <Typography variant="body2" color="text.secondary">
          MP4, WebM · Tối đa 500MB
        </Typography>
      </Box>
    </>
  );
};

const EntityDialog = ({ open, title, onClose, onSave, saving, children }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ mt: 1 }}>{children}</Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={saving}>Hủy</Button>
      <Button variant="contained" onClick={onSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
        {saving ? 'Đang lưu...' : 'Lưu'}
      </Button>
    </DialogActions>
  </Dialog>
);

const ActionBtns = ({ onEdit, onDelete }) => (
  <>
    <IconButton size="small" onClick={onEdit} sx={{ color: 'rgba(255,255,255,0.5)' }}>
      <EditRoundedIcon fontSize="small" />
    </IconButton>
    <IconButton size="small" onClick={onDelete} sx={{ color: '#f87171' }}>
      <DeleteRoundedIcon fontSize="small" />
    </IconButton>
  </>
);

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };
