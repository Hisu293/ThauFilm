import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../hooks/useBooking';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { bookingStatusLabel, paymentStatusLabel, refundStatusLabel } from '../utils/statusLabels';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const formatShowDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Đang cập nhật';

const formatShowTime = (booking) => {
  if (!booking?.startTime) return 'Đang cập nhật';
  const time = new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const format = String(booking.showtimeFormat || '2D').toUpperCase() === 'ONLINE'
    ? 'Trực tuyến'
    : booking.showtimeFormat || '2D';
  return `${time} (${format})`;
};

const theaterLabel = (name) =>
  String(name || '').toUpperCase() === 'ONLINE' ? 'Trực tuyến' : name || 'ThauFilm Cinema';

const enrichBooking = (booking, showtimeMap) => {
  const showtime = showtimeMap.get(String(booking?.showtimeId));
  if (!booking || !showtime) return booking;

  const hasMovieTitle = booking.movieTitle && booking.movieTitle !== 'Vé xem phim';
  const hasRoomName = booking.roomName && booking.roomName !== 'Phòng chiếu';

  return {
    ...booking,
    movieTitle: hasMovieTitle ? booking.movieTitle : showtime.movieTitle || booking.movieTitle,
    roomName: hasRoomName ? booking.roomName : showtime.room || booking.roomName,
    startTime: booking.startTime || showtime.startTime,
    showtimeFormat: showtime.format || '2D',
    theaterName: showtime.theaterName || 'ThauFilm Cinema',
  };
};

const canCancelBooking = (status) => ['HOLD', 'PENDING'].includes(String(status || '').toUpperCase());

const MyBookingDetailPage = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, clearError, getDetail, getTickets, syncPayment, cancel } = useBooking();
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [autoRefundOpen, setAutoRefundOpen] = useState(false);
  const [refundBankBin, setRefundBankBin] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [autoRefundReason, setAutoRefundReason] = useState('Khách hàng hủy vé');
  const [refundReason, setRefundReason] = useState('');
  const [refundTicketCode, setRefundTicketCode] = useState('');
  const [refundRequest, setRefundRequest] = useState(null);
  const [automaticRefundAvailable, setAutomaticRefundAvailable] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [qrUploading, setQrUploading] = useState(false);

  useEffect(() => {
    let active = true;
    const payosReturnedPaid = String(searchParams.get('status') || '').toUpperCase() === 'PAID'
      && String(searchParams.get('cancel') || '').toLowerCase() !== 'true';
    const detailPromise = (payosReturnedPaid ? syncPayment(bookingId).catch(() => null) : Promise.resolve(null))
      .then(() => getDetail(bookingId));

    Promise.all([
      detailPromise,
      getTickets(bookingId).catch(() => []),
      bookingApi.fetchShowtimes().catch(() => []),
      bookingApi.fetchMyRefundRequests().catch(() => null),
      bookingApi.fetchAutomaticRefundAvailability().catch(() => null),
    ])
      .then(async ([bookingDetail, ticketList, showtimeResponse, refundResponse, automaticRefundResponse]) => {
        if (!active) return;
        const rawShowtimes = showtimeResponse?.data ?? showtimeResponse ?? [];
        const showtimeMap = new Map(
          bookingService.normalizeShowtimes(Array.isArray(rawShowtimes) ? rawShowtimes : [])
            .map((showtime) => [String(showtime.id), showtime]),
        );
        const enrichedBooking = enrichBooking(bookingDetail, showtimeMap);
        const normalizedTickets = Array.isArray(ticketList) ? ticketList : [];
        setBooking(enrichedBooking);
        setTickets(normalizedTickets);
        const refundList = refundResponse?.data?.data ?? refundResponse?.data ?? [];
        const currentRefund = Array.isArray(refundList)
          ? refundList.find((item) => String(item.bookingId) === String(bookingId)) || null
          : null;
        setRefundRequest(currentRefund);
        if (searchParams.get('support') === 'refund' && currentRefund?.id) {
          const messagesResponse = await bookingApi.fetchRefundMessages(currentRefund.id).catch(() => null);
          if (active) {
            setMessages(messagesResponse?.data?.data ?? messagesResponse?.data ?? []);
            setChatOpen(true);
          }
        }
        const automaticRefundData = automaticRefundResponse?.data?.data
          ?? automaticRefundResponse?.data
          ?? {};
        setAutomaticRefundAvailable(Boolean(automaticRefundData.available));
        if (normalizedTickets[0]?.ticketCode) setRefundTicketCode(normalizedTickets[0].ticketCode);
      })
      .catch((loadError) => {
        if (active) setSnackbar(loadError?.message || 'Không thể tải chi tiết vé. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, getDetail, getTickets, navigate, searchParams, syncPayment]);

  const seatLabels = useMemo(() => (booking?.seats || []).map((seat) => seat.label).join(', '), [booking]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const updated = await cancel(bookingId);
      if (updated) setBooking(updated);
      setConfirmOpen(false);
      setSnackbar('Đã hủy booking và giải phóng ghế.');
    } catch {
      setConfirmOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundRequest = async () => {
    setActionLoading(true);
    try {
      const response = await bookingApi.requestRefund(bookingId, refundTicketCode, refundReason);
      const created = response?.data?.data ?? response?.data ?? null;
      setRefundRequest(created);
      setRefundOpen(false);
      setRefundReason('');
      setSnackbar('Đã gửi yêu cầu hoàn tiền đến staff trưởng.');
    } catch (err) {
      clearError();
      setSnackbar(err?.message || 'Không thể gửi yêu cầu hoàn tiền.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutomaticRefund = async () => {
    setActionLoading(true);
    try {
      const response = await bookingApi.requestRefund(
        bookingId,
        refundTicketCode,
        autoRefundReason.trim(),
        'AUTOMATIC',
        refundBankBin.trim(),
        refundAccountNumber.trim(),
      );
      const created = response?.data?.data ?? response?.data ?? null;
      setRefundRequest(created);
      setAutoRefundOpen(false);
      setSnackbar('Đã gửi yêu cầu. PayOS/Bảo Kim chỉ chuyển tiền sau khi staff/admin duyệt.');
    } catch (err) {
      setSnackbar(err?.message || 'Không thể gửi yêu cầu hoàn tiền tự động.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRefundChat = async () => {
    if (!refundRequest?.id) return;
    setChatOpen(true);
    const response = await bookingApi.fetchRefundMessages(refundRequest.id).catch(() => null);
    setMessages(response?.data?.data ?? response?.data ?? []);
  };

  const sendRefundMessage = async () => {
    const content = messageText.trim();
    if (!content || !refundRequest?.id) return;
    const response = await bookingApi.sendRefundMessage(refundRequest.id, content);
    const message = response?.data?.data ?? response?.data;
    setMessages((list) => [...list, message]);
    setMessageText('');
  };

  const uploadRefundQr = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image || !refundRequest?.id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size > 8 * 1024 * 1024) {
      setSnackbar('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP tối đa 8 MB.');
      return;
    }
    setQrUploading(true);
    try {
      const response = await bookingApi.sendRefundQr(refundRequest.id, image, messageText.trim());
      const message = response?.data?.data ?? response?.data;
      setMessages((list) => [...list, message]);
      setRefundRequest((current) => ({ ...current, refundQrImageUrl: message?.imageUrl || current?.refundQrImageUrl }));
      setMessageText('');
      setSnackbar('Đã gửi ảnh QR nhận tiền cho staff trưởng.');
    } catch (err) {
      setSnackbar(err?.message || 'Không thể tải ảnh QR lên.');
    } finally {
      setQrUploading(false);
    }
  };

  if (dataLoading && !booking) {
    return (
      <Container maxWidth="md" sx={{ py: 5, minHeight: '70vh', position: 'relative' }}>
        <LoadingOverlay open message="Đang tải chi tiết booking..." blur fullScreen />
      </Container>
    );
  }

  if (!booking && !dataLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <EmptyState title="Không tìm thấy booking" description="Booking này không tồn tại hoặc bạn không có quyền truy cập." />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5, position: 'relative', minHeight: '70vh' }}>
      <LoadingOverlay open={actionLoading} message="Đang hủy booking..." blur fullScreen />
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/my-bookings')} sx={{ mb: 3 }}>
        Quay lại vé đã đặt
      </Button>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {booking.movieTitle}
              </Typography>
              <Typography color="text.secondary">Mã đặt vé: {booking.confirmationCode}</Typography>
            </Box>
            <Chip label={bookingStatusLabel(booking.status)} color={booking.status === 'CONFIRMED' ? 'success' : 'warning'} />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={1.5}>
            <Typography>
              <b>Rạp chiếu:</b> {theaterLabel(booking.theaterName)}
            </Typography>
            <Typography>
              <b>Phòng chiếu:</b> {booking.roomName}
            </Typography>
            <Typography>
              <b>Ngày chiếu:</b> {formatShowDate(booking.startTime)}
            </Typography>
            <Typography>
              <b>Suất chiếu:</b> {formatShowTime(booking)}
            </Typography>
            <Typography>
              <b>Ghế:</b> {seatLabels || 'Đang cập nhật'}
            </Typography>
            {booking.paymentStatus && (
              <Typography>
                <b>Trạng thái thanh toán:</b> {paymentStatusLabel(booking.paymentStatus)}
              </Typography>
            )}
            <Typography>
              <b>{booking.discountAmount > 0 ? 'Giá gốc:' : 'Tổng tiền:'}</b>{' '}
              {formatCurrency(booking.originalAmount)}
            </Typography>
            {booking.discountAmount > 0 && (
              <>
                <Typography sx={{ color: 'success.main' }}>
                  <b>Giảm giá:</b> -{formatCurrency(booking.discountAmount)}
                </Typography>
                <Typography>
                  <b>Số tiền đã thanh toán:</b> {formatCurrency(booking.totalAmount)}
                </Typography>
              </>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            {booking.status === 'CONFIRMED' && (
              <Button
                variant="contained"
                onClick={() =>
                  navigate('/booking/success', {
                    state: {
                      bookingId,
                      movie: { title: booking.movieTitle },
                      showtime: {
                        room: booking.roomName,
                        theaterName: booking.theaterName || 'ThauFilm Cinema',
                        startTime: booking.startTime,
                        date: booking.startTime ? String(booking.startTime).slice(0, 10) : '',
                        time: booking.startTime ? String(booking.startTime).slice(11, 16) : '',
                        format: booking.showtimeFormat || '2D',
                      },
                      selectedSeats: booking.seats || [],
                      bookingCode: booking.confirmationCode,
                      tickets,
                      originalAmount: booking.originalAmount,
                      discountAmount: booking.discountAmount,
                      totalAmount: booking.totalAmount,
                      paymentMethod: booking.paymentMethod || 'paid',
                    },
                  })
                }
              >
                Mở vé thành công
              </Button>
            )}
            {booking.status === 'CONFIRMED' && !refundRequest && (
              <>
                {automaticRefundAvailable && (
                  <Button color="success" variant="contained" onClick={() => setAutoRefundOpen(true)}>
                    Hoàn tiền tự động
                  </Button>
                )}
                <Button color="warning" variant="outlined" onClick={() => setRefundOpen(true)}>
                  Yêu cầu hoàn tiền thủ công
                </Button>
              </>
            )}
            {canCancelBooking(booking.status) && (
              <>
                <Button color="error" variant="outlined" onClick={() => setConfirmOpen(true)}>
                  Hủy booking
                </Button>
                <Button variant="contained" onClick={() => navigate('/payment', { state: { bookingId } })}>
                  Tiếp tục thanh toán
                </Button>
              </>
            )}
          </Stack>
          {refundRequest && (
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mt: 3 }}>
              <Alert severity={refundRequest.status === 'REJECTED' ? 'error' : refundRequest.status === 'APPROVED' ? 'success' : 'info'} sx={{ flex: 1 }}>
                Yêu cầu hoàn tiền: <b>{refundStatusLabel(refundRequest.status)}</b>{refundRequest.rejectionReason ? ` · ${refundRequest.rejectionReason}` : ''}
              </Alert>
              <Button variant="contained" startIcon={<ChatRoundedIcon />} onClick={openRefundChat}>Chat với staff trưởng</Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={refundOpen} onClose={() => !actionLoading && setRefundOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Gửi yêu cầu hoàn tiền</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">Staff trưởng sẽ kiểm tra mã vé, trạng thái check-in và điều kiện hoàn. Yêu cầu từ 200.000đ trở lên cần Admin duyệt.</Alert>
            <TextField select label="Mã vé" value={refundTicketCode} onChange={(event) => setRefundTicketCode(event.target.value)}>
              {tickets.map((ticket) => <MenuItem key={ticket.ticketCode || ticket.id} value={ticket.ticketCode}>{ticket.ticketCode}</MenuItem>)}
            </TextField>
            <TextField multiline minRows={4} label="Lý do hoàn tiền" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} helperText="Nhập ít nhất 10 ký tự để staff trưởng có đủ thông tin kiểm tra." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleRefundRequest} disabled={actionLoading || refundReason.trim().length < 10 || !refundTicketCode}>Gửi yêu cầu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={autoRefundOpen} onClose={() => !actionLoading && setAutoRefundOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Yêu cầu hoàn tiền tự động qua PayOS/Bảo Kim</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">Staff/Admin sẽ kiểm tra theo chính sách hiện tại. Chỉ sau khi được duyệt, PayOS/Bảo Kim mới chuyển tiền vào tài khoản bạn nhập.</Alert>
            <TextField label="Mã BIN ngân hàng" value={refundBankBin} onChange={(event) => setRefundBankBin(event.target.value.replace(/\D/g, '').slice(0, 10))} helperText="Ví dụ: 970422" inputProps={{ inputMode: 'numeric' }} />
            <TextField label="Số tài khoản nhận tiền" value={refundAccountNumber} onChange={(event) => setRefundAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 20))} inputProps={{ inputMode: 'numeric' }} />
            <TextField multiline minRows={2} label="Lý do hoàn tiền" value={autoRefundReason} onChange={(event) => setAutoRefundReason(event.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoRefundOpen(false)}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleAutomaticRefund} disabled={actionLoading || !refundTicketCode || !/^\d{6,10}$/.test(refundBankBin) || !/^\d{5,20}$/.test(refundAccountNumber)}>
            Gửi yêu cầu duyệt
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={chatOpen} onClose={() => setChatOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle><ChatRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Hỗ trợ hoàn tiền</DialogTitle>
        <DialogContent dividers>
          {refundRequest?.requiresAdmin && !refundRequest?.refundQrImageUrl && <Alert severity="warning" sx={{ mb: 1.5 }}>
            Đơn từ 200.000đ cần ảnh QR nhận tiền. Hãy bấm “Gửi QR” để staff kiểm tra và chuyển Admin duyệt.
          </Alert>}
          <Stack spacing={1.2} sx={{ minHeight: 300, maxHeight: 430, overflowY: 'auto' }}>
            {messages.map((message) => {
              const mine = String(message.senderId) === String(user?.id);
              return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '78%', bgcolor: mine ? 'primary.main' : 'action.hover', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.2, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>{mine ? 'Bạn' : message.senderName || 'Staff trưởng'}</Typography>
                <Typography variant="body2">{message.content}</Typography>
                {message.imageUrl && <Box component="a" href={message.imageUrl} target="_blank" rel="noreferrer" display="block" mt={1}>
                  <Box component="img" src={message.imageUrl} alt="QR nhận tiền" sx={{ display: 'block', width: '100%', maxWidth: 260, maxHeight: 260, objectFit: 'contain', borderRadius: 1.5, bgcolor: 'common.white' }} />
                </Box>}
              </Box>;
            })}
          </Stack>
          {['REQUESTED', 'PENDING_APPROVAL'].includes(refundRequest?.status) && <Button component="label" fullWidth variant="outlined" startIcon={<AddPhotoAlternateRoundedIcon />} disabled={qrUploading} sx={{ mt: 1.5 }}>
            {qrUploading ? 'Đang tải ảnh QR...' : refundRequest?.refundQrImageUrl ? 'Đổi ảnh QR nhận tiền' : 'Chọn ảnh QR để gửi'}
            <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadRefundQr} />
          </Button>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <TextField fullWidth size="small" placeholder="Nhắn cho staff trưởng..." value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendRefundMessage(); } }} />
          <Button variant="contained" onClick={sendRefundMessage} disabled={!messageText.trim()}><SendRoundedIcon /></Button>
        </DialogActions>
      </Dialog>

      <ConfirmationDialog
        open={confirmOpen}
        title="Hủy booking?"
        description="Ghế đang giữ sẽ được giải phóng. Bạn có chắc chắn muốn hủy booking này không?"
        confirmText="Hủy booking"
        loading={loading || actionLoading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
      />

      <Snackbar open={Boolean(snackbar)} autoHideDuration={3500} onClose={() => setSnackbar('')}>
        <Alert severity="success" variant="filled" onClose={() => setSnackbar('')}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MyBookingDetailPage;
