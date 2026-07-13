import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SeatMap from '../components/SeatMap';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { connectGroupBooking } from '../services/realtimeService';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
const statusLabel = {
  WAITING_SELECTION: 'Chờ chọn ghế',
  WAITING_PAYMENTS: 'Chờ cả hai thanh toán',
  PARTIALLY_PAID: 'Đã có một người thanh toán',
  CONFIRMED: 'Đã xác nhận',
  EXPIRED: 'Đã hết hạn',
  CANCELLED: 'Đã hủy',
};

export default function GroupBookingPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('disconnected');
  const [paymentMethod, setPaymentMethod] = useState('PAYOS');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const realtime = useRef(null);
  const paymentSyncStarted = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = unwrap(await bookingApi.fetchGroupBooking(groupId));
      setGroup(next);
      if (next?.showtimeId && next?.status === 'WAITING_SELECTION') {
        const rawSeats = unwrap(await bookingApi.fetchShowtimeSeats(next.showtimeId));
        setSeats(bookingService.normalizeSeats(rawSeats));
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải booking nhóm.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!group || ['CONFIRMED', 'EXPIRED', 'CANCELLED'].includes(group.status)) return undefined;
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [group, load]);

  useEffect(() => {
    const connection = connectGroupBooking({
      groupId,
      onStatus: setRealtimeStatus,
      onEvent: (event) => {
        if (['GROUP_SUBSCRIBED', 'GROUP_SEAT_PREVIEW'].includes(event.type)) {
          setSelectedSeatIds((event.data?.selectedSeatIds || []).map(String));
        } else if (event.type === 'GROUP_BOOKING_UPDATED') {
          window.setTimeout(() => load(true), 120);
        } else if (event.type === 'REALTIME_ERROR') {
          setError(event.data?.message || 'Không thể đồng bộ phòng đặt vé.');
        }
      },
    });
    realtime.current = connection;
    return () => { connection.disconnect(); realtime.current = null; };
  }, [groupId, load]);

  const selectedSeats = useMemo(
    () => selectedSeatIds.map((id) => seats.find((seat) => String(seat.id) === id)).filter(Boolean),
    [selectedSeatIds, seats]
  );

  const adjacent = useMemo(() => {
    if (selectedSeats.length !== 2) return false;
    const sorted = [...selectedSeats].sort((a, b) => a.col - b.col);
    return sorted.every((seat) => seat.type !== 'COUPLE')
      && sorted[0].rowName === sorted[1].rowName
      && sorted[1].col - sorted[0].col === 1;
  }, [selectedSeats]);

  const coupleSelection = selectedSeats.length === 1 && selectedSeats[0].type === 'COUPLE';
  const validSelection = coupleSelection || adjacent;

  const toggleSeat = (seat) => {
    if (!realtime.current?.toggleSeat(seat.id)) {
      setError('Kết nối realtime đang gián đoạn. Vui lòng chờ kết nối lại.');
    }
  };

  const selectSeats = async () => {
    if (!validSelection) return;
    setBusy(true); setError('');
    try {
      setGroup(unwrap(await bookingApi.selectGroupSeats(groupId, selectedSeats.map((seat) => seat.id))));
      setSelectedSeatIds([]);
    } catch (err) { setError(err.message || 'Không thể giữ cặp ghế.'); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const next = unwrap(await bookingApi.payGroupBooking(groupId, paymentMethod));
      setGroup(next);
      if (next?.checkoutUrl) window.location.assign(next.checkoutUrl);
    }
    catch (err) { setError(err.message || 'Thanh toán thất bại.'); }
    finally { setBusy(false); }
  };

  const syncPayosPayment = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const next = unwrap(await bookingApi.syncGroupPayment(groupId));
      setGroup(next);
      navigate(`/booking/group/${groupId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'PayOS chưa xác nhận thanh toán. Vui lòng thử lại sau.');
    } finally {
      setBusy(false);
    }
  }, [groupId, navigate]);

  useEffect(() => {
    if (!group || paymentSyncStarted.current || searchParams.get('payment') !== 'return') return;
    paymentSyncStarted.current = true;
    syncPayosPayment();
  }, [group, searchParams, syncPayosPayment]);

  if (loading) return <Box py={12} textAlign="center"><CircularProgress /></Box>;
  if (!group) return <Container sx={{ py: 6 }}><Alert severity="error">{error || 'Không tìm thấy booking nhóm.'}</Alert></Container>;

  const me = group.members?.find((member) => member.currentUser);
  const terminal = ['EXPIRED', 'CANCELLED'].includes(group.status);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={900}>Đặt vé xem phim cùng nhau</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Chip label={statusLabel[group.status] || group.status} color={group.status === 'CONFIRMED' ? 'success' : terminal ? 'error' : 'warning'} />
            {group.expiresAt && <Typography variant="body2" color="text.secondary">Hạn thanh toán: {new Date(group.expiresAt).toLocaleString('vi-VN')}</Typography>}
            <Chip size="small" variant="outlined" color={realtimeStatus === 'connected' ? 'success' : 'warning'} label={realtimeStatus === 'connected' ? 'Realtime' : 'Đang kết nối lại'} />
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {group.status === 'PARTIALLY_PAID' && <Alert severity="info">Một người đã thanh toán. Vé chỉ được phát hành sau khi người còn lại thanh toán.</Alert>}
        {group.status === 'CONFIRMED' && <Alert severity="success">Cả hai đã thanh toán. Vé của bạn đã có trong mục Vé của tôi.</Alert>}
        {terminal && <Alert severity="error">Booking nhóm không còn hiệu lực. Khoản đã thanh toán được đánh dấu hoàn tiền.</Alert>}

        {group.status === 'WAITING_SELECTION' && (
          <Paper sx={{ p: { xs: 2, md: 4 } }}>
            <Typography variant="h6" fontWeight={800} mb={1}>Chọn một ghế đôi hoặc hai ghế liền nhau</Typography>
            <Typography color="text.secondary" mb={3}>Ghế đôi COUPLE dành cho cả hai người nên chỉ cần chọn một ghế. Với ghế thường/VIP, hãy chọn hai ghế liền nhau.</Typography>
            <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSelectSeat={toggleSeat} />
            {selectedSeats.length > 0 && !validSelection && <Alert severity="warning" sx={{ mt: 2 }}>Chọn một ghế đôi, hoặc hai ghế thường/VIP cùng hàng và liền nhau.</Alert>}
            <Box textAlign="right" mt={3}><Button variant="contained" disabled={!validSelection || busy} onClick={selectSeats}>Giữ ghế trong 15 phút</Button></Box>
          </Paper>
        )}

        {group.status !== 'WAITING_SELECTION' && (
          <Stack spacing={2}>
            {(group.members || []).map((member) => (
              <Paper key={member.userId} sx={{ p: 2.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
                  <Box><Typography fontWeight={800}>{member.fullName || 'Thành viên'} {member.currentUser ? '(Bạn)' : ''}</Typography><Typography color="text.secondary">Ghế {member.seatLabel || '—'} · {money(member.amount)}</Typography></Box>
                  <Chip label={member.paymentStatus === 'PAID' ? 'Đã thanh toán' : member.paymentStatus === 'REFUNDED' ? 'Đã hoàn tiền' : 'Chưa thanh toán'} color={member.paymentStatus === 'PAID' ? 'success' : member.paymentStatus === 'REFUNDED' ? 'default' : 'warning'} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {group.canPay && me && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800}>Thanh toán phần của bạn: {money(me.amount)}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
              <FormControl fullWidth><InputLabel>Phương thức</InputLabel><Select label="Phương thức" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><MenuItem value="PAYOS">PayOS / VietQR</MenuItem><MenuItem value="VNPAY">VNPay</MenuItem><MenuItem value="MOMO">MoMo</MenuItem><MenuItem value="ZALOPAY">ZaloPay</MenuItem></Select></FormControl>
              <Button variant="contained" size="large" disabled={busy} onClick={pay}>Thanh toán vé của tôi</Button>
            </Stack>
            {group.checkoutUrl && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
                <Button variant="outlined" onClick={() => window.location.assign(group.checkoutUrl)}>Mở lại PayOS</Button>
                <Button variant="outlined" disabled={busy} onClick={syncPayosPayment}>Kiểm tra thanh toán</Button>
              </Stack>
            )}
          </Paper>
        )}

        {group.status === 'CONFIRMED' && <Box textAlign="right"><Button variant="contained" onClick={() => navigate(`/my-bookings/${me?.bookingId}`)}>Xem vé của tôi</Button></Box>}
      </Stack>
    </Container>
  );
}
