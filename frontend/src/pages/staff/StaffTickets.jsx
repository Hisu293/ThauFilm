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
} from '@mui/material';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { staffTicketService } from '../../services/staffTicketService';
import { paymentStatusLabel } from '../../utils/statusLabels';
import QrScannerDialog from '../../components/QrScannerDialog';

// Nhãn + màu cho trạng thái vé
const STATUS_META = {
  PAID: { label: 'Đã thanh toán', color: 'info' },
  CHECKED_IN: { label: 'Đã check-in', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
};

const extractTicketCodeFromQr = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Ticket PDF QR payload format from backend:
  // TICKET|bookingCode|movie|showtime|room|TK123456=E5;TK654321=E6
  if (raw.startsWith('TICKET|')) {
    const parts = raw.split('|');
    const ticketPart = parts[parts.length - 1] || '';
    const firstTicket = ticketPart.split(';')[0] || '';
    const code = firstTicket.split('=')[0] || '';
    return code.trim();
  }

  // Backward-compatible mock/old payloads can include the code between pipes.
  const ticketCodeMatch = raw.match(/\b(?:TK|TCK)-?\d{4,}\b/i);
  if (ticketCodeMatch) return ticketCodeMatch[0].toUpperCase();

  return raw;
};
const statusOf = (t) => {
  if (t.status) return t.status;
  return t.checkedIn ? 'CHECKED_IN' : 'PAID';
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
  const value = item?.createdAt || item?.paidAt || item?.updatedAt || item?.startTime || item?.showtime;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};
const formatTheaterRoom = (ticket) =>
  [ticket?.theaterName, ticket?.cinemaRoomName || ticket?.roomName].filter(Boolean).join(' · ');
const movieDisplay = (ticket) => ticket?.movieTitle || (ticket?.showtimeId ? 'Phim không còn trong dữ liệu' : '—');
const showtimeDisplay = (ticket) => formatDateTime(ticket?.startTime || ticket?.showtime);

const StaffTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Check-in
  const [scanCode, setScanCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Dialog chi tiết
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [page, setPage] = useState(0);

  // Hủy vé
  const [cancelTarget, setCancelTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffTicketService.list();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách vé.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
  }, [loadTickets]);

  // Đồng bộ 1 vé sau khi thao tác. Nếu vé chưa có trong list hiện tại thì thêm vào đầu list.
  const patchTicket = (dto) => {
    if (!dto?.id) return;
    setTickets((list) => {
      const exists = list.some((t) => t.id === dto.id);
      if (!exists) return [dto, ...list];
      return list.map((t) => (t.id === dto.id ? { ...t, ...dto } : t));
    });
    setDetail((current) => (current?.id === dto.id ? { ...current, ...dto } : current));
  };

  const handleCheckIn = async (codeArg) => {
    const code = extractTicketCodeFromQr(codeArg ?? scanCode);
    if (!code) return;
    setCheckingIn(true);
    try {
      const dto = await staffTicketService.checkIn(code);
      const fresh = dto?.id ? await staffTicketService.getById(dto.id).catch(() => null) : null;
      const merged = { ...(dto || {}), ...(fresh || {}) };
      patchTicket(merged);
      setToast({ severity: 'success', message: `Check-in thành công vé ${merged.ticketCode || code}.` });
      setScanCode('');
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Check-in thất bại.' });
    } finally {
      setCheckingIn(false);
    }
  };

  // Quét QR xong: đóng camera, đổ mã vào ô và check-in luôn
  const handleScanned = (decodedText) => {
    const code = extractTicketCodeFromQr(decodedText);
    setScannerOpen(false);
    if (!code) return;
    setScanCode(code);
    handleCheckIn(code);
  };

  const openDetail = async (ticket) => {
    setDetail(ticket);
    setPayment(null);
    setDetailLoading(true);
    try {
      const [fresh, pay] = await Promise.all([
        staffTicketService.getById(ticket.id),
        staffTicketService.getPayment(ticket.id).catch(() => null),
      ]);
      if (fresh) setDetail(fresh);
      setPayment(pay);
    } catch {
      /* giữ dữ liệu sẵn có */
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async () => {
    const target = cancelTarget;
    setCancelTarget(null);
    try {
      const dto = await staffTicketService.cancel(target.id);
      patchTicket(dto);
      if (detail?.id === target.id) setDetail((d) => ({ ...d, ...dto, status: 'CANCELLED' }));
      setToast({ severity: 'success', message: `Đã hủy vé ${target.ticketCode}.` });
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Hủy vé thất bại.' });
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? tickets.filter((t) =>
      [t.ticketCode, t.customerName, t.movieTitle, t.theaterName, t.cinemaRoomName, t.roomName, t.seatLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
    : tickets;
  const sortedFiltered = [...filtered].sort((a, b) => latestTime(b) - latestTime(a));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(sortedFiltered.length / PAGE_SIZE) - 1));
  const pagedTickets = sortedFiltered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ConfirmationNumberRoundedIcon color="primary" /> Quản lý vé
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Xem vé đã đặt, thông tin khách, kiểm tra thanh toán, check-in QR, hủy và in lại vé.
        </Typography>
      </Box>

      {/* Check-in bằng mã/QR */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerRoundedIcon color="primary" /> Check-in vé
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              size="small"
              placeholder="Quét hoặc nhập mã vé (vd: TCK-2001)"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              sx={{ flex: 1, maxWidth: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleCheckIn()}
              disabled={checkingIn || !scanCode.trim()}
              startIcon={checkingIn ? <CircularProgress size={16} color="inherit" /> : <CheckCircleRoundedIcon />}
            >
              {checkingIn ? 'Đang xử lý…' : 'Check-in'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setScannerOpen(true)}
              disabled={checkingIn}
              startIcon={<QrCodeScannerRoundedIcon />}
            >
              Quét QR
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Danh sách vé */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Danh sách vé</Typography>
        <TextField
          size="small"
          placeholder="Tìm theo mã vé, khách, phim…"
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
              <Button variant="outlined" onClick={loadTickets}>Thử lại</Button>
            </Box>
          ) : sortedFiltered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>Không có vé nào khớp.</Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Mã vé</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phim / Ghế</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedTickets.map((t) => {
                    const st = statusOf(t);
                    const meta = STATUS_META[st] || { label: st, color: 'default' };
                    const cancellable = !t.checkedIn && st !== 'CANCELLED';
                    return (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{t.ticketCode}</Typography>
                        </TableCell>
                        <TableCell>{t.customerName || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{movieDisplay(t)}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">{formatTheaterRoom(t)}</Typography>
                          <Typography variant="caption" color="text.secondary">Ghế {t.seatLabel || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Chi tiết & thanh toán">
                            <IconButton size="small" onClick={() => openDetail(t)}>
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={cancellable ? 'Hủy vé' : 'Không thể hủy'}>
                            <span>
                              <IconButton size="small" sx={{ color: cancellable ? 'error.main' : undefined }} onClick={() => setCancelTarget(t)} disabled={!cancellable}>
                                <CancelRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
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

      {/* Dialog chi tiết vé */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Vé {detail.ticketCode}
            </DialogTitle>
            <DialogContent dividers>
              {detailLoading && <CircularProgress size={20} sx={{ mb: 1 }} />}
              <Stack spacing={1.2}>
                <Row label="Trạng thái" value={(STATUS_META[statusOf(detail)] || {}).label || statusOf(detail)} />
                <Row label="Khách hàng" value={detail.customerName} />
                <Row label="Email" value={detail.customerEmail} />
                <Row label="Số điện thoại" value={detail.customerPhone} />
                <Divider />
                <Row label="Phim" value={movieDisplay(detail)} />
                <Row label="Rạp / Phòng" value={formatTheaterRoom(detail)} />
                <Row label="Ghế" value={detail.seatLabel} />
                <Row label="Suất chiếu" value={showtimeDisplay(detail)} />
                <Divider />
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PaymentRoundedIcon fontSize="small" /> Thanh toán
                </Typography>
                <Row label="Phương thức" value={payment?.paymentMethod || payment?.method || detail.paymentMethod || detail.payment?.method} />
                <Row label="Số tiền" value={formatCurrency(payment?.amount ?? detail.paymentAmount ?? detail.payment?.amount)} />
                <Row label="Tình trạng" value={paymentStatusLabel(payment?.status || detail.paymentStatus || detail.payment?.status)} />
                <Row label="Mã giao dịch" value={payment?.transactionId || detail.transactionId || detail.payment?.transactionId || payment?.id} />
                <Row label="Thời gian TT" value={formatDateTime(payment?.paidAt || detail.paidAt || detail.payment?.paidAt || payment?.createdAt)} />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDetail(null)}>Đóng</Button>
              <Button
                color="error"
                variant="contained"
                startIcon={<CancelRoundedIcon />}
                onClick={() => setCancelTarget(detail)}
                disabled={detail.checkedIn || statusOf(detail) === 'CANCELLED'}
              >
                Hủy vé
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Xác nhận hủy */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Hủy vé?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Hủy vé <b>{cancelTarget?.ticketCode}</b> của khách <b>{cancelTarget?.customerName}</b>?
            Theo chính sách, vé chưa check-in sẽ được hoàn tiền.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelTarget(null)}>Đóng</Button>
          <Button color="error" variant="contained" onClick={handleCancel}>Xác nhận hủy</Button>
        </DialogActions>
      </Dialog>

      <QrScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanned}
      />

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

export default StaffTickets;
