import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import SeatMap from '../components/SeatMap';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

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
  const [group, setGroup] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!group || ['CONFIRMED', 'EXPIRED', 'CANCELLED'].includes(group.status)) return undefined;
    const timer = window.setInterval(() => load(true), 5000);
    return () => window.clearInterval(timer);
  }, [group, load]);

  const adjacent = useMemo(() => {
    if (selectedSeats.length !== 2) return false;
    const sorted = [...selectedSeats].sort((a, b) => a.col - b.col);
    return sorted[0].rowName === sorted[1].rowName && sorted[1].col - sorted[0].col === 1;
  }, [selectedSeats]);

  const toggleSeat = (seat) => {
    setSelectedSeats((current) => {
      if (current.some((item) => item.id === seat.id)) return current.filter((item) => item.id !== seat.id);
      return current.length >= 2 ? [current[1], seat] : [...current, seat];
    });
  };

  const selectSeats = async () => {
    if (!adjacent) return;
    setBusy(true); setError('');
    try {
      setGroup(unwrap(await bookingApi.selectGroupSeats(groupId, selectedSeats.map((seat) => seat.id))));
      setSelectedSeats([]);
    } catch (err) { setError(err.message || 'Không thể giữ cặp ghế.'); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true); setError('');
    try { setGroup(unwrap(await bookingApi.payGroupBooking(groupId, paymentMethod))); }
    catch (err) { setError(err.message || 'Thanh toán thất bại.'); }
    finally { setBusy(false); }
  };

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
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {group.status === 'PARTIALLY_PAID' && <Alert severity="info">Một người đã thanh toán. Vé chỉ được phát hành sau khi người còn lại thanh toán.</Alert>}
        {group.status === 'CONFIRMED' && <Alert severity="success">Cả hai đã thanh toán. Vé của bạn đã có trong mục Vé của tôi.</Alert>}
        {terminal && <Alert severity="error">Booking nhóm không còn hiệu lực. Khoản đã thanh toán được đánh dấu hoàn tiền.</Alert>}

        {group.status === 'WAITING_SELECTION' && (
          <Paper sx={{ p: { xs: 2, md: 4 } }}>
            <Typography variant="h6" fontWeight={800} mb={1}>Chọn đúng 2 ghế liền nhau</Typography>
            <Typography color="text.secondary" mb={3}>Người chọn ghế được gán ghế bên trái; người còn lại nhận ghế bên phải.</Typography>
            <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSelectSeat={toggleSeat} />
            {selectedSeats.length === 2 && !adjacent && <Alert severity="warning" sx={{ mt: 2 }}>Hai ghế phải cùng hàng và nằm liền nhau.</Alert>}
            <Box textAlign="right" mt={3}><Button variant="contained" disabled={!adjacent || busy} onClick={selectSeats}>Giữ cặp ghế trong 15 phút</Button></Box>
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
              <FormControl fullWidth><InputLabel>Phương thức</InputLabel><Select label="Phương thức" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><MenuItem value="VNPAY">VNPay</MenuItem><MenuItem value="MOMO">MoMo</MenuItem><MenuItem value="ZALOPAY">ZaloPay</MenuItem></Select></FormControl>
              <Button variant="contained" size="large" disabled={busy} onClick={pay}>Thanh toán vé của tôi</Button>
            </Stack>
          </Paper>
        )}

        {group.status === 'CONFIRMED' && <Box textAlign="right"><Button variant="contained" onClick={() => navigate(`/my-bookings/${me?.bookingId}`)}>Xem vé của tôi</Button></Box>}
      </Stack>
    </Container>
  );
}
