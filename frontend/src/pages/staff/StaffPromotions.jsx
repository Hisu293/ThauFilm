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
  TablePagination,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Tooltip,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import { staffPromotionService } from '../../services/staffPromotionService';
import { fromUTCToLocal, toBackendLocalDateTime } from '../../services/adminShowtimeService';
import useStaffList from '../../hooks/useStaffList';

const PROMOTION_DATE_FIELDS = ['createdAt', 'updatedAt', 'validFrom'];
const matchesPromotionSearch = (promotion, query) =>
  [promotion.code, promotion.name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const TYPE_META = {
  PERCENTAGE: { label: 'Giảm %', color: 'info' },
  PERCENT: { label: 'Giảm %', color: 'info' },
  FIXED: { label: 'Giảm tiền', color: 'secondary' },
};
const TYPE_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Giảm theo phần trăm (%)' },
  { value: 'FIXED', label: 'Giảm số tiền cố định (đ)' },
];

const SEAT_TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Ghế thường' },
  { value: 'VIP', label: 'Ghế VIP' },
  { value: 'COUPLE', label: 'Ghế đôi' },
];

const emptyForm = {
  code: '', name: '', type: 'PERCENTAGE', value: '',
  minPurchaseAmount: 0, maxDiscountAmount: 0,
  validFrom: '', validTo: '', usageLimit: '', active: true,
  applicableSeatTypes: '',
  minimumMemberTier: 'V_STAR', customerSegment: 'ALL',
  applicableMovieIds: '', applicableGenres: '', applicableTheaterIds: '',
  applicableRoomIds: '', applicableShowtimeIds: '',
  applicableChannels: 'CINEMA', applicableWeekdays: '',
  startHour: '', endHour: '', perUserLimit: 1, budgetLimit: '',
};

const STEPS = ['Quyền lợi', 'Đối tượng áp dụng', 'Thời gian và ngân sách'];
const CHANNEL_OPTIONS = [
  { value: 'CINEMA', label: 'Vé tại rạp' },
  { value: 'ONLINE', label: 'Vé online' },
  { value: 'WATCH_PARTY', label: 'Watch Party' },
];
const WEEKDAY_OPTIONS = [
  ['MONDAY', 'Thứ Hai'], ['TUESDAY', 'Thứ Ba'], ['WEDNESDAY', 'Thứ Tư'],
  ['THURSDAY', 'Thứ Năm'], ['FRIDAY', 'Thứ Sáu'], ['SATURDAY', 'Thứ Bảy'], ['SUNDAY', 'Chủ Nhật'],
];

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};
const formatCurrency = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? `${new Intl.NumberFormat('vi-VN').format(value)} VND` : '-';
};

const discountText = (p) =>
  ['PERCENT', 'PERCENTAGE'].includes(String(p.type).toUpperCase()) ? `${p.value}%` : formatCurrency(p.value);

const parseSeatTypes = (value) => {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

const serializeSeatTypes = (values) => parseSeatTypes(values).join(',');

const seatTypeLabelText = (value) => {
  const selected = parseSeatTypes(value);
  if (selected.length === 0 || SEAT_TYPE_OPTIONS.every((option) => selected.includes(option.value))) {
    return 'Tat ca ghe';
  }
  return SEAT_TYPE_OPTIONS
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)
    .join(', ');
};

const StaffPromotions = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState(null); // { mode: 'add'|'edit', id? }
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

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
    setActiveStep(0);
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
    setActiveStep(0);
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

  const toggleSeatType = (seatType) => {
    const current = parseSeatTypes(form.applicableSeatTypes);
    const next = current.includes(seatType)
      ? current.filter((item) => item !== seatType)
      : [...current, seatType];
    setForm({ ...form, applicableSeatTypes: serializeSeatTypes(next) });
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
    items: promos,
    matchesSearch: matchesPromotionSearch,
    dateFields: PROMOTION_DATE_FIELDS,
  });

  const toggleCsvValue = (field, value) => {
    const current = parseSeatTypes(form[field]);
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setForm({ ...form, [field]: next.join(',') });
  };

  const validateStep = () => {
    if (activeStep === 0 && (!form.code.trim() || !form.name.trim() || !form.value)) {
      setFormError('Vui lòng nhập mã, tên chương trình và giá trị giảm.');
      return false;
    }
    if (activeStep === 2 && (!form.validFrom || !form.validTo || !form.usageLimit)) {
      setFormError('Vui lòng nhập thời gian áp dụng và tổng lượt sử dụng.');
      return false;
    }
    setFormError('');
    return true;
  };

  const openDashboard = async (promotion) => {
    setDashboard({ promotion, data: null });
    setDashboardLoading(true);
    try {
      const data = await staffPromotionService.getDashboard(promotion.id);
      setDashboard({ promotion, data });
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Không thể tải dashboard chiến dịch.' });
      setDashboard(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  const previewText = () => {
    const benefit = ['PERCENT', 'PERCENTAGE'].includes(form.type)
      ? `Giảm ${form.value || 0}%` : `Giảm ${formatCurrency(form.value || 0)}`;
    const maximum = form.maxDiscountAmount ? `, tối đa ${formatCurrency(form.maxDiscountAmount)}` : '';
    const tier = form.minimumMemberTier === 'V_PLATINUM' ? 'V-Platinum'
      : form.minimumMemberTier === 'V_DIAMOND' ? 'V-Diamond trở lên' : 'mọi hạng thành viên';
    const channels = CHANNEL_OPTIONS.filter((item) => parseSeatTypes(form.applicableChannels).includes(item.value)).map((item) => item.label).join(', ');
    return `${benefit}${maximum}, dành cho ${tier}, áp dụng ${channels || 'mọi kênh'}, tối đa ${form.usageLimit || 0} lượt.`;
  };

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
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 280 } }}
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
          ) : filteredItems.length === 0 ? (
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
                  {paginatedItems.map((p) => {
                    const tm = TYPE_META[p.type] || { label: p.type, color: 'default' };
                    const limit = p.usageLimit;
                    const used = p.usageCount ?? p.usedCount ?? 0;
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
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {seatTypeLabelText(p.applicableSeatTypes)}
                          </Typography>
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
                          <Tooltip title="Dashboard chiến dịch">
                            <IconButton size="small" color="info" onClick={() => openDashboard(p)}>
                              <AnalyticsRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
          {dialog?.mode === 'add' ? 'Tạo mã giảm giá' : 'Cập nhật mã giảm giá'}
        </DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {activeStep === 0 && <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Mã giảm giá" fullWidth value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <TextField select label="Loại" fullWidth value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Tên chương trình" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={['PERCENT', 'PERCENTAGE'].includes(form.type) ? 'Gia tri giam (%)' : 'Gia tri giam (VND)'}
                type="number"
                fullWidth
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">{['PERCENT', 'PERCENTAGE'].includes(form.type) ? '%' : 'VND'}</InputAdornment> }}
              />
              <TextField label="Giảm tối đa (đ)" type="number" fullWidth value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Đơn tối thiểu (đ)" type="number" fullWidth value={form.minPurchaseAmount} onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })} />
              <TextField label="Giới hạn lượt dùng" type="number" fullWidth value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
            </Stack>
            </>}
            {activeStep === 1 && <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Hạng thành viên tối thiểu" fullWidth value={form.minimumMemberTier} onChange={(e) => setForm({ ...form, minimumMemberTier: e.target.value })}>
                <MenuItem value="V_STAR">V-Star</MenuItem><MenuItem value="V_DIAMOND">V-Diamond</MenuItem><MenuItem value="V_PLATINUM">V-Platinum</MenuItem>
              </TextField>
              <TextField select label="Nhóm khách hàng" fullWidth value={form.customerSegment} onChange={(e) => setForm({ ...form, customerSegment: e.target.value })}>
                <MenuItem value="ALL">Tất cả</MenuItem><MenuItem value="NEW">Khách hàng mới</MenuItem><MenuItem value="RETURNING">Khách quay lại</MenuItem>
              </TextField>
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Ap dung cho loai ghe
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {SEAT_TYPE_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={parseSeatTypes(form.applicableSeatTypes).includes(option.value)}
                        onChange={() => toggleSeatType(option.value)}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Khong chon loai ghe nao thi ma giam gia ap dung cho ca ghe thuong, VIP va ghe doi.
              </Typography>
            </Box>
            <Box><Typography variant="subtitle2" fontWeight={700}>Kênh mua vé</Typography>
              <Stack direction="row" flexWrap="wrap">
                {CHANNEL_OPTIONS.map((option) => <FormControlLabel key={option.value} control={<Checkbox checked={parseSeatTypes(form.applicableChannels).includes(option.value)} onChange={() => toggleCsvValue('applicableChannels', option.value)} />} label={option.label} />)}
              </Stack>
            </Box>
            <TextField label="ID phim áp dụng" value={form.applicableMovieIds} onChange={(e) => setForm({ ...form, applicableMovieIds: e.target.value })} helperText="Để trống để áp dụng mọi phim; nhiều ID cách nhau bằng dấu phẩy." />
            <TextField label="Thể loại áp dụng" value={form.applicableGenres} onChange={(e) => setForm({ ...form, applicableGenres: e.target.value })} helperText="Ví dụ: ACTION,COMEDY. Để trống để áp dụng mọi thể loại." />
            <TextField label="ID rạp áp dụng" value={form.applicableTheaterIds} onChange={(e) => setForm({ ...form, applicableTheaterIds: e.target.value })} helperText="Để trống để áp dụng mọi rạp." />
            <TextField label="ID phòng chiếu áp dụng" value={form.applicableRoomIds} onChange={(e) => setForm({ ...form, applicableRoomIds: e.target.value })} />
            <TextField label="ID suất chiếu áp dụng" value={form.applicableShowtimeIds} onChange={(e) => setForm({ ...form, applicableShowtimeIds: e.target.value })} />
            </>}
            {activeStep === 2 && <>
            <Box><Typography variant="subtitle2" fontWeight={700}>Ngày áp dụng trong tuần</Typography>
              <Stack direction="row" flexWrap="wrap">
                {WEEKDAY_OPTIONS.map(([value, label]) => <FormControlLabel key={value} control={<Checkbox checked={parseSeatTypes(form.applicableWeekdays).includes(value)} onChange={() => toggleCsvValue('applicableWeekdays', value)} />} label={label} />)}
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Bắt đầu" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              <TextField label="Kết thúc" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Giờ bắt đầu" type="time" fullWidth InputLabelProps={{ shrink: true }} value={form.startHour} onChange={(e) => setForm({ ...form, startHour: e.target.value })} />
              <TextField label="Giờ kết thúc" type="time" fullWidth InputLabelProps={{ shrink: true }} value={form.endHour} onChange={(e) => setForm({ ...form, endHour: e.target.value })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Lượt tối đa mỗi thành viên" type="number" fullWidth value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
              <TextField label="Ngân sách tối đa (đ)" type="number" fullWidth value={form.budgetLimit} onChange={(e) => setForm({ ...form, budgetLimit: e.target.value })} />
            </Stack>
            <Alert severity="info"><b>Xem trước:</b> {previewText()}</Alert>
            </>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Hủy</Button>
          {activeStep > 0 && <Button onClick={() => { setFormError(''); setActiveStep((step) => step - 1); }}>Quay lại</Button>}
          {activeStep < STEPS.length - 1 ? (
            <Button variant="contained" onClick={() => { if (validateStep()) setActiveStep((step) => step + 1); }}>Tiếp tục</Button>
          ) : (
            <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
              {saving ? 'Đang lưu…' : dialog?.mode === 'add' ? 'Phát hành chiến dịch' : 'Lưu thay đổi'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={!!dashboard} onClose={() => setDashboard(null)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={800}>Dashboard chiến dịch {dashboard?.promotion?.code}</DialogTitle>
        <DialogContent dividers>
          {dashboardLoading ? <Box textAlign="center" py={5}><CircularProgress /></Box> : dashboard?.data ? <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {[['Đang giữ', dashboard.data.heldCount], ['Đã dùng', dashboard.data.usedCount], ['Thất bại', dashboard.data.failedCount], ['Chuyển đổi', `${dashboard.data.conversionRate || 0}%`]].map(([label, value]) => (
                <Card key={label} sx={{ flex: 1 }}><CardContent><Typography color="text.secondary" variant="caption">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography></CardContent></Card>
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Alert severity="info" sx={{ flex: 1 }}>Doanh thu trước giảm: <b>{formatCurrency(dashboard.data.revenueBeforeDiscount)}</b><br />Doanh thu sau giảm: <b>{formatCurrency(dashboard.data.revenueAfterDiscount)}</b></Alert>
              <Alert severity="warning" sx={{ flex: 1 }}>Ngân sách đã dùng: <b>{formatCurrency(dashboard.data.budgetUsed)}</b><br />Ngân sách tối đa: <b>{dashboard.data.budgetLimit ? formatCurrency(dashboard.data.budgetLimit) : 'Không giới hạn'}</b></Alert>
            </Stack>
            <Divider />
            <Typography fontWeight={800}>Booking sử dụng gần nhất</Typography>
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Booking</TableCell><TableCell>Trước giảm</TableCell><TableCell>Đã giảm</TableCell><TableCell>Thực trả</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead><TableBody>
              {(dashboard.data.bookings || []).map((item) => <TableRow key={item.paymentId}><TableCell>{String(item.bookingId).slice(0, 8)}</TableCell><TableCell>{formatCurrency(item.originalAmount)}</TableCell><TableCell>{formatCurrency(item.discountAmount)}</TableCell><TableCell>{formatCurrency(item.paidAmount)}</TableCell><TableCell>{item.status === 'PAID' ? 'Đã thanh toán' : item.status === 'PENDING' ? 'Đang chờ' : 'Thất bại'}</TableCell></TableRow>)}
            </TableBody></Table></TableContainer>
          </Stack> : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setDashboard(null)}>Đóng</Button></DialogActions>
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
