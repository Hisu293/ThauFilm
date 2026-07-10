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
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useBooking } from '../hooks/useBooking';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

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
  return `${time} (${booking.showtimeFormat || '2D'})`;
};

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, clearError, getDetail, getTickets, syncPayment, cancel } = useBooking();
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
    ])
      .then(([bookingDetail, ticketList, showtimeResponse]) => {
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
        if (payosReturnedPaid && String(enrichedBooking?.status || '').toUpperCase() === 'CONFIRMED') {
          navigate('/booking/success', {
            replace: true,
            state: {
              bookingId,
              movie: { title: enrichedBooking.movieTitle },
              showtime: {
                room: enrichedBooking.roomName,
                theaterName: enrichedBooking.theaterName || 'ThauFilm Cinema',
                startTime: enrichedBooking.startTime,
                date: enrichedBooking.startTime ? String(enrichedBooking.startTime).slice(0, 10) : '',
                time: enrichedBooking.startTime ? String(enrichedBooking.startTime).slice(11, 16) : '',
                format: enrichedBooking.showtimeFormat || '2D',
              },
              selectedSeats: enrichedBooking.seats || [],
              bookingCode: enrichedBooking.confirmationCode,
              tickets: normalizedTickets,
              originalAmount: enrichedBooking.originalAmount,
              discountAmount: enrichedBooking.discountAmount,
              totalAmount: enrichedBooking.totalAmount,
              paymentMethod: enrichedBooking.paymentMethod || 'PAYOS',
            },
          });
        }
      })
      .catch(() => {})
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
            <Chip label={booking.status || 'UNKNOWN'} color={booking.status === 'CONFIRMED' ? 'success' : 'warning'} />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={1.5}>
            <Typography>
              <b>Rạp chiếu:</b> {booking.theaterName || 'ThauFilm Cinema'}
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
        </CardContent>
      </Card>

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
