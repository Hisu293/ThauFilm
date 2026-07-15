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
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { staffBookingApi } from '../../api/staffBookingApi';

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

// Nhãn + màu trạng thái đơn
const STATUS_META = {
  CONFIRMED: { label: 'Đã xác nhận', color: 'success' },
  PENDING: { label: 'Chờ thanh toán', color: 'warning' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'default' },
  REFUND_PENDING: { label: 'Chờ hoàn tiền thủ công', color: 'warning' },
};
const PAY_META = {
  PAID: { label: 'Đã thanh toán', color: 'success' },
  PENDING: { label: 'Chờ thanh toán', color: 'warning' },
  REFUND_PENDING: { label: 'Chờ hoàn tiền thủ công', color: 'warning' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'default' },
  FAILED: { label: 'Thất bại', color: 'error' },
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};
const formatCurrency = (n) =>
  Number.isFinite(Number(n)) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n)) : '—';
const PAGE_SIZE = 10;
const latestTime = (item) => {
  const value = item?.createdAt || item?.confirmedAt || item?.paidAt || item?.updatedAt || item?.startTime;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};
const paymentMethodOf = (payment, detail) =>
  payment?.paymentMethod || payment?.method || detail?.paymentMethod || detail?.payment?.paymentMethod || detail?.payment?.method;
const paymentStatusOf = (payment, detail) =>
  payment?.status || detail?.paymentStatus || detail?.payment?.status;

const StaffBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [purchased, setPurchased] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const [confirm, setConfirm] = useState(null); // { action, booking }
  const [toast, setToast] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = unwrap(await staffBookingApi.fetchBookings());
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings();
  }, [loadBookings]);

  const patchBooking = (dto) => setBookings((list) => list.map((b) => (b.id === dto.id ? { ...b, ...dto } : b)));

  const openDetail = async (booking) => {
    setDetail(booking);
    setPayment(null);
    setPurchased(null);
    setDetailLoading(true);
    try {
      const [fresh, pay, pm] = await Promise.all([
        staffBookingApi.fetchBookingDetail(booking.id).then(unwrap).catch(() => null),
        staffBookingApi.fetchPayment(booking.id).then(unwrap).catch(() => null),
        booking.userId
          ? staffBookingApi.fetchPurchasedMoviesByUser(booking.userId).then(unwrap).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (fresh) setDetail(fresh);
      setPayment(pay);
      setPurchased(pm);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id) => {
    const [fresh, pm] = await Promise.all([
      staffBookingApi.fetchBookingDetail(id).then(unwrap).catch(() => null),
      detail?.userId ? staffBookingApi.fetchPurchasedMoviesByUser(detail.userId).then(unwrap).catch(() => null) : null,
    ]);
    if (fresh) setDetail((d) => ({ ...d, ...fresh }));
    if (pm) setPurchased(pm);
  };

  const runAction = async () => {
    const { action, booking } = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      if (action === 'regrant') {
        await staffBookingApi.regrantAccess(booking.id).then(unwrap);
        setToast({ severity: 'success', message: 'Đã cấp lại quyền xem cho khách.' });
        await refreshDetail(booking.id);
      } else if (action === 'refund') {
        await staffBookingApi.refund(booking.id).then(unwrap);
        setToast({
          severity: 'success',
          message: 'Đã ghi nhận yêu cầu hoàn tiền. Cần xử lý chuyển khoản thủ công theo thông tin khách.',
        });
        patchBooking({ id: booking.id, status: 'REFUND_PENDING' });
        const pay = await staffBookingApi.fetchPayment(booking.id).then(unwrap).catch(() => null);
        setPayment(pay);
      } else if (action === 'cancel') {
        const dto = await staffBookingApi.cancel(booking.id).then(unwrap);
        setToast({ severity: 'success', message: 'Đã hủy đơn hàng.' });
        patchBooking(dto || { id: booking.id, status: 'CANCELLED' });
        if (detail?.id === booking.id) setDetail((d) => ({ ...d, status: 'CANCELLED' }));
      }
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Thao tác thất bại.' });
    } finally {
      setBusy(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? bookings.filter((b) =>
        [b.confirmationCode, b.movieTitle, b.cinemaRoomName, b.customerName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : bookings;
  const sortedFiltered = [...filtered].sort((a, b) => latestTime(b) - latestTime(a));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(sortedFiltered.length / PAGE_SIZE) - 1));
  const pagedBookings = sortedFiltered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const confirmText = {
    regrant: { title: 'Cấp lại quyền xem?', body: 'Cấp lại quyền xem phim online cho khách của đơn này?', btn: 'Cấp lại quyền', color: 'primary' },
    refund: { title: 'Ghi nhận yêu cầu hoàn tiền?', body: 'Hệ thống không có QR chuyển khoản của khách. Thao tác này chỉ đánh dấu chờ hoàn tiền thủ công để nhân viên kế toán xử lý.', btn: 'Ghi nhận', color: 'warning' },
    cancel: { title: 'Hủy đơn hàng?', body: 'Hủy đơn sẽ giải phóng ghế và thu hồi quyền xem. Tiếp tục?', btn: 'Hủy đơn', color: 'error' },
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongRoundedIcon color="primary" /> Quản lý đơn hàng
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Xem đơn mua phim, lịch sử giao dịch, kiểm tra thanh toán & quyền xem, cấp lại quyền, hoàn tiền và hủy đơn.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Danh sách đơn mua phim</Typography>
        <TextField
          size="small"
          placeholder="Tìm theo mã đơn, phim, khách…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
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
              <Button variant="outlined" onClick={loadBookings}>Thử lại</Button>
            </Box>
          ) : sortedFiltered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>Không có đơn hàng nào khớp.</Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phim / Phòng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Suất chiếu</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tổng tiền</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedBookings.map((b) => {
                    const meta = STATUS_META[b.status] || { label: b.status, color: 'default' };
                    return (
                      <TableRow key={b.id} hover>
                        <TableCell><Typography fontWeight={700}>{b.confirmationCode}</Typography></TableCell>
                        <TableCell>{b.customerName || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{b.movieTitle}</Typography>
                          <Typography variant="caption" color="text.secondary">{b.cinemaRoomName}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{formatDateTime(b.startTime)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(b.totalAmount)}</TableCell>
                        <TableCell><Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell align="right">
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => openDetail(b)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={sortedFiltered.length}
                page={currentPage}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
              />
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog chi tiết đơn */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Đơn {detail.confirmationCode}
              <Chip
                size="small"
                sx={{ ml: 1, fontWeight: 700 }}
                label={(STATUS_META[detail.status] || {}).label || detail.status}
                color={(STATUS_META[detail.status] || {}).color || 'default'}
              />
            </DialogTitle>
            <DialogContent dividers>
              {detailLoading && <CircularProgress size={20} sx={{ mb: 1 }} />}
              <Stack spacing={1.2}>
                <Typography variant="subtitle2" fontWeight={700}>Khách hàng</Typography>
                <Row label="Họ tên" value={detail.customerName} />
                <Row label="Email" value={detail.customerEmail} />
                <Row label="Số điện thoại" value={detail.customerPhone} />
                <Row
                  label="Quyền xem phim"
                  value={detail.accessGranted || detail.paymentStatus === 'PAID' || paymentStatusOf(payment, detail) === 'PAID' ? 'Đã cấp' : 'Chưa cấp / cần kiểm tra'}
                />
                <Divider />
                <Typography variant="subtitle2" fontWeight={700}>Đơn hàng</Typography>
                <Row label="Phim" value={detail.movieTitle} />
                <Row label="Phòng" value={detail.cinemaRoomName} />
                <Row label="Suất chiếu" value={formatDateTime(detail.startTime)} />
                <Row label="Ghế" value={(detail.seats || []).map((s) => `${s.rowName}${s.seatNumber}`).join(', ')} />
                <Row label="Tổng tiền" value={formatCurrency(detail.totalAmount)} />
                <Row label="Xác nhận lúc" value={formatDateTime(detail.confirmedAt)} />

                <Divider />
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PaymentRoundedIcon fontSize="small" /> Thanh toán
                </Typography>
                <Row label="Phương thức" value={paymentMethodOf(payment, detail)} />
                <Row label="Số tiền" value={formatCurrency(payment?.amount ?? detail.payment?.amount)} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Tình trạng</Typography>
                  {(() => {
                    const ps = paymentStatusOf(payment, detail);
                    const pm = PAY_META[ps] || { label: ps, color: 'default' };
                    return <Chip size="small" label={pm.label} color={pm.color} sx={{ fontWeight: 700 }} />;
                  })()}
                </Stack>
                <Row label="Mã giao dịch" value={payment?.transactionId || detail.payment?.transactionId} />

                {/* Lịch sử giao dịch */}
                {(() => {
                  const history = payment?.history || detail.payment?.history || [];
                  if (!history.length) return null;
                  return (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Lịch sử giao dịch</Typography>
                      <List dense disablePadding>
                        {history.map((h, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 0.2 }}>
                            <ListItemText
                              primary={h.action}
                              secondary={`${formatDateTime(h.at)} · ${formatCurrency(h.amount)}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  );
                })()}

                {/* Phim đã mua của khách */}
                {purchased?.movies?.length ? (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" fontWeight={700}>Phim đã mua của khách ({purchased.total})</Typography>
                    <List dense disablePadding>
                      {purchased.movies.map((m) => (
                        <ListItem key={m.bookingId} disableGutters sx={{ py: 0.2 }}>
                          <ListItemText
                            primary={`${m.movieTitle} — ${m.accessGranted ? 'có quyền xem' : 'chưa có quyền'}`}
                            secondary={formatDateTime(m.startTime)}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button onClick={() => setDetail(null)}>Đóng</Button>
              <Button
                startIcon={busy ? <CircularProgress size={16} /> : <LockOpenRoundedIcon />}
                onClick={() => setConfirm({ action: 'regrant', booking: detail })}
                disabled={busy || detail.status === 'CANCELLED' || detail.accessGranted}
              >
                Cấp lại quyền
              </Button>
              <Button
                color="warning"
                startIcon={<CurrencyExchangeRoundedIcon />}
                onClick={() => setConfirm({ action: 'refund', booking: detail })}
                disabled={busy || paymentStatusOf(payment, detail) !== 'PAID'}
              >
                Hoàn tiền
              </Button>
              <Button
                color="error"
                variant="contained"
                startIcon={<CancelRoundedIcon />}
                onClick={() => setConfirm({ action: 'cancel', booking: detail })}
                disabled={busy || detail.status === 'CANCELLED'}
              >
                Hủy đơn
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Xác nhận hành động */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        {confirm && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>{confirmText[confirm.action].title}</DialogTitle>
            <DialogContent><Typography variant="body2">{confirmText[confirm.action].body}</Typography></DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setConfirm(null)}>Đóng</Button>
              <Button color={confirmText[confirm.action].color} variant="contained" startIcon={<ReplayRoundedIcon sx={{ display: 'none' }} />} onClick={runAction}>
                {confirmText[confirm.action].btn}
              </Button>
            </DialogActions>
          </>
        )}
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

const Row = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value || '—'}</Typography>
  </Stack>
);

export default StaffBookings;
