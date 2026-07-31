import { useCallback, useEffect, useMemo, useState } from 'react';
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
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import adminService from '../../services/adminService';
import { connectRealtime } from '../../services/realtimeService';

const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusMeta = {
  REQUESTED: { label: 'Staff đang kiểm tra', color: 'info' },
  PENDING_APPROVAL: { label: 'Chờ Admin duyệt', color: 'warning' },
  APPROVED: { label: 'Đã hoàn tiền', color: 'success' },
  REJECTED: { label: 'Đã từ chối', color: 'error' },
  REFUND_PENDING: { label: 'Đang hoàn qua cổng', color: 'warning' },
  REFUND_FAILED: { label: 'Hoàn tiền lỗi', color: 'error' },
};

const metricSx = {
  height: '100%',
  borderRadius: 2.5,
  boxShadow: 'none',
  background: 'linear-gradient(145deg, rgba(255,255,255,.04), rgba(255,255,255,.01))',
};

const RefundSection = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await adminService.getRefundRequests());
    } catch (err) {
      setError(err.message || 'Không thể tải yêu cầu hoàn tiền.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    const disconnect = connectRealtime({
      onEvent: (event) => {
        if (event?.type === 'NOTIFICATION' && event?.data?.notificationType === 'REFUND_APPROVAL') load(true);
      },
    });
    const handleFocus = () => load(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  const stats = useMemo(() => ({
    pending: items.filter((item) => item.status === 'PENDING_APPROVAL').length,
    amount: items.filter((item) => item.status === 'PENDING_APPROVAL').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    approved: items.filter((item) => item.status === 'APPROVED').length,
    rejected: items.filter((item) => item.status === 'REJECTED').length,
  }), [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!keyword) return true;
      return [item.bookingCode, item.ticketCode, item.customerName, item.customerEmail, item.movieTitle, item.staffName, item.reason]
        .some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
    });
  }, [items, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const pagedItems = filteredItems.slice(safePage * 10, safePage * 10 + 10);

  const patchItem = (updated) => setItems((list) => list.map((item) => (item.id === updated.id ? updated : item)));

  const approve = async () => {
    if (!approving) return;
    setBusy(true);
    setError('');
    try {
      patchItem(await adminService.approveRefund(approving.id));
      setApproving(null);
    } catch (err) {
      setError(err.message || 'Không thể duyệt yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(true);
    setError('');
    try {
      patchItem(await adminService.rejectRefund(rejecting.id, reason));
      setRejecting(null);
      setReason('');
    } catch (err) {
      setError(err.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const retryAutomatic = async (item) => {
    setBusy(true);
    setError('');
    try {
      const updated = await adminService.retryAutomaticRefund(item.id);
      patchItem(updated);
      setSelected((current) => (current?.id === updated.id ? updated : current));
    } catch (err) {
      setError(err.message || 'Không thể thử lại lệnh chi PayOS/Bảo Kim.');
    } finally {
      setBusy(false);
    }
  };

  const metrics = [
    { label: 'Chờ Admin duyệt', value: stats.pending, icon: PendingActionsRoundedIcon, color: '#f59e0b' },
    { label: 'Tổng tiền đang chờ', value: money(stats.amount), icon: CurrencyExchangeRoundedIcon, color: '#ef4444' },
    { label: 'Đã hoàn thành', value: stats.approved, icon: TaskAltRoundedIcon, color: '#22c55e' },
    { label: 'Đã từ chối', value: stats.rejected, icon: CancelRoundedIcon, color: '#94a3b8' },
  ];

  return <Stack spacing={1.5}>
    <Card sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative', boxShadow: 'none' }}>
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 12% 0%, rgba(229,9,20,.24), transparent 38%), radial-gradient(circle at 90% 100%, rgba(245,158,11,.14), transparent 34%)' }} />
      <CardContent sx={{ position: 'relative', p: { xs: 2, md: 2.25 }, '&:last-child': { pb: { xs: 2, md: 2.25 } } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.25}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ bgcolor: 'rgba(229,9,20,.16)', color: 'primary.main', width: 42, height: 42 }}><ShieldRoundedIcon fontSize="small" /></Avatar>
            <Box>
              <Typography variant="h5" fontWeight={950}>Duyệt hoàn tiền</Typography>
              <Typography variant="body2" color="text.secondary">Kiểm soát các yêu cầu giá trị cao đã được staff trưởng xác minh.</Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={17} /> : <RefreshRoundedIcon />}
            disabled={refreshing}
            onClick={() => load(true)}
          >
            Làm mới
          </Button>
        </Stack>
      </CardContent>
    </Card>

    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={1.25}>
      {metrics.map(({ label, value, icon: Icon, color }) => <Card key={label} sx={metricSx}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" noWrap fontWeight={950} sx={{ mt: 0.25 }}>{value}</Typography></Box>
            <Avatar sx={{ ml: 1, width: 36, height: 36, bgcolor: `${color}1c`, color }}><Icon fontSize="small" /></Avatar>
          </Stack>
        </CardContent>
      </Card>)}
    </Box>

    <Alert severity="warning" icon={<ShieldRoundedIcon fontSize="small" />} sx={{ borderRadius: 2, py: 0.25, '& .MuiAlert-message': { py: 0.5, fontSize: '0.85rem' } }}>
      Admin chỉ ra quyết định với yêu cầu ở trạng thái <b>Chờ Admin duyệt</b>. Hãy đối chiếu khách hàng, mã vé, suất chiếu và số tiền trước khi xác nhận.
    </Alert>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

    <Card sx={{ borderRadius: 2.5, boxShadow: 'none' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
          <TextField
            size="small"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="Tìm mã booking, mã vé, khách hàng, phim..."
            sx={{ width: { xs: '100%', sm: 380 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
          />
          <TextField select size="small" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} sx={{ minWidth: 190 }}>
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            {Object.entries(statusMeta).map(([value, meta]) => <MenuItem key={value} value={value}>{meta.label}</MenuItem>)}
          </TextField>
        </Stack>
      </CardContent>
      <Divider />

      {loading ? <Box minHeight={340} display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box> : <TableContainer sx={{ overflowX: 'hidden' }}>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed', '& th': { py: 1.25, px: 1.25, fontSize: '0.76rem' }, '& td': { px: 1.25, fontSize: '0.82rem', verticalAlign: 'middle' } }}>
          <TableHead><TableRow>
            <TableCell sx={{ width: '17%' }}>Yêu cầu</TableCell>
            <TableCell sx={{ width: '25%' }}>Khách hàng</TableCell>
            <TableCell sx={{ width: '28%' }}>Vé / phim</TableCell>
            <TableCell sx={{ width: '30%' }}>Xác minh / lý do</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {pagedItems.map((item) => {
              const meta = statusMeta[item.status] || { label: item.status, color: 'default' };
              return <TableRow key={item.id} hover sx={{ '& td': { py: 1.25 } }}>
                <TableCell><Typography fontWeight={850}>{item.bookingCode || '—'}</Typography><Typography variant="caption" color="text.secondary">Gửi: {dateTime(item.createdAt)}</Typography></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12, fontWeight: 850 }}>{(item.customerName || item.customerEmail || '?').slice(0, 2).toUpperCase()}</Avatar>
                    <Box sx={{ minWidth: 0 }}><Typography noWrap fontWeight={750}>{item.customerName || '—'}</Typography><Typography noWrap display="block" variant="caption" color="text.secondary" title={item.customerEmail || ''}>{item.customerEmail || '—'}</Typography></Box>
                  </Stack>
                </TableCell>
                <TableCell><Typography fontFamily="monospace" fontWeight={800}>{item.ticketCode || '—'}</Typography><Typography noWrap variant="caption" color="text.secondary" display="block">{item.movieTitle || '—'}</Typography></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Chip size="small" label={meta.label} color={meta.color} sx={{ maxWidth: '100%' }} />
                      <Typography noWrap variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{item.reason || 'Không có lý do'}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityRoundedIcon />}
                      onClick={() => setSelected(item)}
                      sx={{ flexShrink: 0 }}
                    >
                      Xem
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>;
            })}
            {!filteredItems.length && <TableRow><TableCell colSpan={4}>
              <Stack alignItems="center" spacing={1.25} py={8}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'text.secondary' }}><ReceiptLongRoundedIcon /></Avatar>
                <Typography fontWeight={850}>{items.length ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu cần Admin duyệt'}</Typography>
                <Typography variant="body2" color="text.secondary">Yêu cầu vượt ngưỡng sẽ xuất hiện sau khi staff trưởng kiểm tra và chuyển lên.</Typography>
              </Stack>
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>}
      {!loading && <TablePagination
        component="div"
        count={filteredItems.length}
        page={safePage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={10}
        rowsPerPageOptions={[10]}
        labelRowsPerPage="Số dòng mỗi trang"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />}
    </Card>

    <Dialog open={Boolean(selected)} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="md">
      <DialogTitle fontWeight={900}>Chi tiết yêu cầu hoàn tiền</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
            <Box><Typography variant="caption" color="text.secondary">Mã booking / mã vé</Typography><Typography fontWeight={900}>{selected?.bookingCode || '—'} · {selected?.ticketCode || '—'}</Typography></Box>
            <Chip label={(statusMeta[selected?.status] || {}).label || selected?.status || '—'} color={(statusMeta[selected?.status] || {}).color || 'default'} />
          </Stack>
          <Divider />
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
            <Box><Typography variant="caption" color="text.secondary">Khách hàng</Typography><Typography fontWeight={800}>{selected?.customerName || '—'}</Typography><Typography variant="body2">{selected?.customerEmail || '—'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Staff trưởng xác minh</Typography><Typography fontWeight={800}>{selected?.staffName || 'Chưa chỉ định'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Phim / suất chiếu</Typography><Typography fontWeight={800}>{selected?.movieTitle || '—'}</Typography><Typography variant="body2">{dateTime(selected?.showtimeStart)} – {dateTime(selected?.showtimeEnd)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Số tiền hoàn</Typography><Typography variant="h6" fontWeight={950} color="warning.main">{money(selected?.amount)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Trạng thái suất chiếu</Typography><Typography fontWeight={700}>{selected?.showtimeEnded ? 'Suất đã kết thúc' : selected?.showtimeStarted ? 'Suất đang chiếu' : 'Chưa đến giờ chiếu'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Dữ liệu xem phim</Typography><Typography fontWeight={700} color={selected?.contentAccessed ? 'error.main' : 'success.main'}>{selected?.contentAccessed ? `Đã mở phim lúc ${dateTime(selected?.firstViewedAt)}` : 'Chưa ghi nhận mở phim'}</Typography></Box>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}><Typography variant="caption" color="text.secondary">Lý do khách gửi</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected?.reason || 'Không có lý do'}</Typography>{selected?.rejectionReason && <Typography color="error.main" sx={{ mt: 1 }}>Phản hồi xử lý: {selected.rejectionReason}</Typography>}</Box>
          <Box><Typography variant="caption" color="text.secondary">Phương thức nhận tiền</Typography><Typography fontWeight={750}>{selected?.refundMethod === 'AUTOMATIC' ? `PayOS/Bảo Kim · BIN ${selected?.bankBin || '—'} · STK ${selected?.bankAccountNumber || '—'}` : 'Hoàn tiền thủ công bằng QR'}</Typography></Box>
          {selected?.refundQrImageUrl && <Button variant="outlined" startIcon={<QrCode2RoundedIcon />} href={selected.refundQrImageUrl} target="_blank" rel="noreferrer">Mở QR nhận tiền</Button>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setSelected(null)}>Đóng</Button>
        {selected?.automaticRetryAvailable && <Button variant="contained" color="warning" startIcon={<RefreshRoundedIcon />} disabled={busy} onClick={() => retryAutomatic(selected)}>Thử hoàn lại</Button>}
        {selected?.status === 'PENDING_APPROVAL' && <Button color="error" disabled={busy} onClick={() => { setRejecting(selected); setSelected(null); }}>Từ chối</Button>}
        {selected?.status === 'PENDING_APPROVAL' && <Button variant="contained" color="success" disabled={busy} onClick={() => { setApproving(selected); setSelected(null); }}>Duyệt hoàn tiền</Button>}
      </DialogActions>
    </Dialog>

    <Dialog open={Boolean(approving)} onClose={() => !busy && setApproving(null)} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={900}>Xác nhận duyệt hoàn tiền</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="warning">Hành động này sẽ gọi quy trình hoàn tiền của cổng thanh toán và không thể hoàn tác trực tiếp.</Alert>
          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Khách hàng</Typography><Typography fontWeight={800}>{approving?.customerName}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Mã vé</Typography><Typography fontFamily="monospace" fontWeight={800}>{approving?.ticketCode}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Số tiền hoàn</Typography><Typography fontWeight={950} color="warning.main">{money(approving?.amount)}</Typography></Stack>
            </Stack>
          </Box>
          {approving?.refundQrImageUrl ? <Box>
            <Typography fontWeight={800} mb={1}>QR nhận tiền của khách</Typography>
            <Box component="a" href={approving.refundQrImageUrl} target="_blank" rel="noreferrer" display="block">
              <Box component="img" src={approving.refundQrImageUrl} alt="QR nhận tiền của khách" sx={{ display: 'block', width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 2, bgcolor: 'common.white' }} />
            </Box>
          </Box> : <Alert severity="error">Không có QR nhận tiền. Yêu cầu staff liên hệ khách trước khi duyệt.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setApproving(null)}>Quay lại</Button><Button variant="contained" color="success" startIcon={<PaidRoundedIcon />} disabled={busy || (approving?.refundMethod !== 'AUTOMATIC' && !approving?.refundQrImageUrl)} onClick={approve}>Xác nhận hoàn tiền</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(rejecting)} onClose={() => !busy && setRejecting(null)} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={900}><PendingActionsRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Từ chối yêu cầu hoàn tiền</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="info">Lý do từ chối sẽ được gửi đến khách hàng và lưu vào lịch sử xử lý.</Alert>
          <TextField autoFocus fullWidth multiline minRows={4} label="Lý do gửi cho khách" value={reason} onChange={(event) => setReason(event.target.value)} helperText="Nhập ít nhất 5 ký tự." />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setRejecting(null)}>Hủy</Button><Button variant="contained" color="error" disabled={busy || reason.trim().length < 5} onClick={reject}>Từ chối yêu cầu</Button></DialogActions>
    </Dialog>
  </Stack>;
};

export default RefundSection;
