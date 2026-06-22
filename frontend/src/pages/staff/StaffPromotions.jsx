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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { staffPromotionService } from '../../services/staffPromotionService';
import { fromUTCToLocal, toBackendLocalDateTime } from '../../services/adminShowtimeService';

const TYPE_META = {
  PERCENT: { label: 'Giảm %', color: 'info' },
  FIXED: { label: 'Giảm tiền', color: 'secondary' },
};
const TYPE_OPTIONS = [
  { value: 'PERCENT', label: 'Giảm theo phần trăm (%)' },
  { value: 'FIXED', label: 'Giảm số tiền cố định (đ)' },
];

const emptyForm = {
  code: '', name: '', type: 'PERCENT', value: '',
  minPurchaseAmount: '', maxDiscountAmount: '',
  validFrom: '', validTo: '', usageLimit: '', active: true,
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};
const formatCurrency = (n) =>
  typeof n === 'number' ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : '—';

const discountText = (p) =>
  p.type === 'PERCENT' ? `${p.value}%` : formatCurrency(p.value);

const StaffPromotions = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [dialog, setDialog] = useState(null); // { mode: 'add'|'edit', id? }
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadPromos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffPromotionService.list();
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách mã giảm giá.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPromos();
  }, [loadPromos]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError('');
    setDialog({ mode: 'add' });
  };

  const openEdit = (p) => {
    setForm({
      ...emptyForm,
      ...p,
      validFrom: fromUTCToLocal(p.validFrom),
      validTo: fromUTCToLocal(p.validTo),
      usageLimit: p.usageLimit ?? '',
    });
    setFormError('');
    setDialog({ mode: 'edit', id: p.id });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.code.trim() || !form.name.trim() || !form.value) {
      setFormError('Vui lòng nhập mã, tên và giá trị giảm.');
      return;
    }
    if (form.validFrom && form.validTo && new Date(form.validTo) <= new Date(form.validFrom)) {
      setFormError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    // chuyển datetime-local → chuỗi backend
    const payload = {
      ...form,
      validFrom: form.validFrom ? toBackendLocalDateTime(form.validFrom) : undefined,
      validTo: form.validTo ? toBackendLocalDateTime(form.validTo) : undefined,
    };
    setSaving(true);
    try {
      if (dialog.mode === 'add') {
        const created = await staffPromotionService.create(payload);
        setPromos((list) => [...list, created]);
        setToast({ severity: 'success', message: 'Tạo mã giảm giá thành công.' });
      } else {
        const updated = await staffPromotionService.update(dialog.id, payload);
        setPromos((list) => list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        setToast({ severity: 'success', message: 'Cập nhật mã giảm giá thành công.' });
      }
      setDialog(null);
    } catch (err) {
      setFormError(err.message || 'Không thể lưu mã giảm giá.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p) => {
    setTogglingId(p.id);
    try {
      const dto = p.active
        ? await staffPromotionService.disable(p.id)
        : await staffPromotionService.enable(p.id);
      setPromos((list) => list.map((x) => (x.id === p.id ? { ...x, ...dto } : x)));
      setToast({ severity: 'success', message: dto.active ? 'Đã kích hoạt mã.' : 'Đã vô hiệu hóa mã.' });
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Thao tác thất bại.' });
    } finally {
      setTogglingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? promos.filter((p) => [p.code, p.name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    : promos;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOfferRoundedIcon color="primary" /> Quản lý khuyến mãi
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Xem & tạo mã giảm giá, kích hoạt/vô hiệu hóa và theo dõi số lần sử dụng.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openAdd} disabled={loading || !!error}>
          Tạo mã giảm giá
        </Button>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Tìm theo mã hoặc tên…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button variant="outlined" onClick={loadPromos}>Thử lại</Button>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>Chưa có mã giảm giá nào.</Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Mã / Tên</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Giảm</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Điều kiện</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Hiệu lực</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Lượt dùng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Kích hoạt</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Sửa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((p) => {
                    const tm = TYPE_META[p.type] || { label: p.type, color: 'default' };
                    const limit = p.usageLimit;
                    const used = p.usedCount ?? 0;
                    const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography fontWeight={800} sx={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{p.code}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={tm.label} color={tm.color} sx={{ fontWeight: 700, mr: 0.5 }} />
                          <Typography component="span" fontWeight={700}>{discountText(p)}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          <Typography variant="caption" display="block">Đơn từ {formatCurrency(p.minPurchaseAmount)}</Typography>
                          {p.maxDiscountAmount ? <Typography variant="caption" display="block">Tối đa {formatCurrency(p.maxDiscountAmount)}</Typography> : null}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          <Typography variant="caption" display="block">{formatDate(p.validFrom)}</Typography>
                          <Typography variant="caption" display="block">→ {formatDate(p.validTo)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{used}{limit != null ? ` / ${limit}` : ''}</Typography>
                          {limit != null && (
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              color={pct >= 100 ? 'error' : 'primary'}
                              sx={{ height: 6, borderRadius: 3, mt: 0.3 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {togglingId === p.id ? (
                            <CircularProgress size={18} />
                          ) : (
                            <Switch checked={!!p.active} onChange={() => handleToggle(p)} size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Sửa">
                            <IconButton size="small" color="primary" onClick={() => openEdit(p)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* Dialog tạo / sửa */}
      <Dialog open={!!dialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialog?.mode === 'add' ? 'Tạo mã giảm giá' : 'Cập nhật mã giảm giá'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Mã giảm giá" fullWidth value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <TextField select label="Loại" fullWidth value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Tên chương trình" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={form.type === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (đ)'}
                type="number"
                fullWidth
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">{form.type === 'PERCENT' ? '%' : 'đ'}</InputAdornment> }}
              />
              <TextField label="Giảm tối đa (đ)" type="number" fullWidth value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Đơn tối thiểu (đ)" type="number" fullWidth value={form.minPurchaseAmount} onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })} />
              <TextField label="Giới hạn lượt dùng" type="number" fullWidth value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Bắt đầu" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              <TextField label="Kết thúc" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Đang lưu…' : dialog?.mode === 'add' ? 'Tạo' : 'Lưu'}
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

export default StaffPromotions;
