import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import { useBooking } from '../hooks/useBooking';
import EmptyState from '../components/common/EmptyState';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { getPendingBooking, mergeMovieContext, mergeShowtimeContext } from '../utils/pendingBookingStorage';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { getSupersededBookingIds } from '../utils/paidBookingStorage';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const formatShowDate = (value) => {
  if (!value) return 'Chưa có lịch chiếu';
  return new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatShowTime = (booking) => {
  if (!booking?.startTime) return '';
  const time = new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${time} (${booking.showtimeFormat || '2D'})`;
};

const statusColor = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'CONFIRMED') return 'success';
  if (normalized === 'HOLD' || normalized === 'PENDING') return 'warning';
  if (normalized === 'CANCELLED' || normalized === 'EXPIRED') return 'error';
  return 'default';
};

const statusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'CONFIRMED') return 'Đã thanh toán';
  if (normalized === 'HOLD' || normalized === 'PENDING') return 'Chờ thanh toán';
  if (normalized === 'CANCELLED') return 'Đã hủy';
  if (normalized === 'EXPIRED') return 'Đã hủy';
  return status || 'UNKNOWN';
};

const isHoldBooking = (booking) => ['HOLD', 'PENDING'].includes(String(booking?.status || '').toUpperCase());

const bookingSeatKey = (booking) => {
  const seatIds = (booking?.seats || [])
    .map((seat) => String(seat.id || seat.label || ''))
    .filter(Boolean)
    .sort()
    .join(',');
  return `${booking?.showtimeId || ''}|${seatIds}`;
};

const hideReplacementBookings = (bookings) => {
  const supersededIds = getSupersededBookingIds();
  const confirmedKeys = new Set(
    bookings
      .filter((booking) => String(booking.status || '').toUpperCase() === 'CONFIRMED')
      .map(bookingSeatKey),
  );

  return bookings.filter((booking) => {
    if (supersededIds.has(String(booking.id))) return false;
    const isCancelled = String(booking.status || '').toUpperCase() === 'CANCELLED';
    return !(isCancelled && confirmedKeys.has(bookingSeatKey(booking)));
  });
};

const getPendingContext = (booking) => getPendingBooking(booking?.id);

const enrichBooking = (booking, showtimeMap) => {
  const showtime = showtimeMap.get(String(booking.showtimeId));
  if (!showtime) return booking;

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

const isPendingContextExpired = (pendingContext) => {
  if (!pendingContext?.holdExpiresAt) return false;
  const expiresMs = new Date(pendingContext.holdExpiresAt).getTime();
  return Number.isFinite(expiresMs) && expiresMs <= Date.now();
};

const isHoldExpired = (booking) => {
  const normalized = String(booking?.status || '').toUpperCase();
  if (!['HOLD', 'PENDING'].includes(normalized)) return false;

  const pendingContext = getPendingContext(booking);
  const holdExpiresAt = pendingContext?.holdExpiresAt || booking?.holdExpiresAt;
  if (!holdExpiresAt) return false;

  const expiresMs = new Date(holdExpiresAt).getTime();
  return Number.isFinite(expiresMs) && expiresMs <= Date.now();
};

const displayStatus = (booking) => (isHoldExpired(booking) ? 'EXPIRED' : booking?.status);

const canResumeBooking = (booking) => {
  const normalized = String(displayStatus(booking) || '').toUpperCase();
  const pendingContext = getPendingContext(booking);
  if (normalized === 'CANCELLED' || normalized === 'EXPIRED' || normalized === 'CONFIRMED') return false;
  if (isPendingContextExpired(pendingContext)) return false;
  return isHoldBooking(booking) || Boolean(pendingContext?.bookingId);
};

const toPaymentState = (booking) => {
  const pendingContext = getPendingContext(booking);
  const movie = mergeMovieContext(
    { title: booking.movieTitle, posterUrl: '/placeholder.svg' },
    pendingContext?.movie,
  );
  const showtime = mergeShowtimeContext(
    {
      id: booking.showtimeId,
      date: booking.startTime ? String(booking.startTime).slice(0, 10) : '',
      time: booking.startTime ? String(booking.startTime).slice(11, 16) : '',
      room: booking.roomName,
      theaterName: booking.theaterName || 'ThauFilm Cinema',
      format: booking.showtimeFormat || '2D',
      startTime: booking.startTime,
    },
    pendingContext?.showtime,
  );

  return {
    bookingId: booking.id,
    movie,
    showtime,
    selectedSeats: pendingContext?.selectedSeats?.length ? pendingContext.selectedSeats : booking.seats || [],
    holdExpiresAt: pendingContext?.holdExpiresAt || booking.holdExpiresAt,
  };
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { loading, error, clearError, getHistory, cancel } = useBooking();
  const [bookings, setBookings] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getHistory(),
      bookingApi.fetchShowtimes().catch(() => []),
    ])
      .then(([data, showtimeResponse]) => {
        if (!active) return;
        const rawShowtimes = showtimeResponse?.data ?? showtimeResponse ?? [];
        const showtimeMap = new Map(
          bookingService.normalizeShowtimes(Array.isArray(rawShowtimes) ? rawShowtimes : [])
            .map((showtime) => [String(showtime.id), showtime]),
        );
        const list = hideReplacementBookings(
          (Array.isArray(data) ? data : []).map((booking) => enrichBooking(booking, showtimeMap)),
        );
        setBookings(list);

        list.filter(isHoldExpired).forEach((booking) => {
          cancel(booking.id)
            .then((updated) => {
              if (!active || !updated) return;
              setBookings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cancel, getHistory]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      const updated = await cancel(cancelTarget.id);
      if (updated) {
        setBookings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
    } finally {
      setCancelTarget(null);
    }
  };

  const sortedBookings = useMemo(
    () =>
      bookings
        .slice()
        .sort((a, b) => new Date(b.confirmedAt || b.holdExpiresAt || b.startTime || 0) - new Date(a.confirmedAt || a.holdExpiresAt || a.startTime || 0)),
    [bookings],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Vé đã đặt
          </Typography>
          <Typography color="text.secondary">Theo dõi lịch sử đặt vé và mở chi tiết vé đã mua.</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/movies')}>
          Đặt vé mới
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading && bookings.length === 0 ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rounded" height={128} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : sortedBookings.length === 0 ? (
        <EmptyState
          icon={ConfirmationNumberRoundedIcon}
          title="Chưa có vé nào"
          description="Bạn chưa có lịch sử đặt vé. Hãy chọn một bộ phim và bắt đầu đặt vé."
          actionText="Xem phim"
          onAction={() => navigate('/movies')}
        />
      ) : (
        <Stack spacing={2}>
          {sortedBookings.map((booking) => (
            <Card key={booking.id} sx={{ borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {booking.movieTitle}
                      </Typography>
                      <Chip
                        size="small"
                        color={canResumeBooking(booking) ? 'warning' : statusColor(displayStatus(booking))}
                        label={canResumeBooking(booking) ? 'Chờ thanh toán' : statusLabel(displayStatus(booking))}
                      />
                    </Stack>
                    <Typography color="text.secondary">{booking.theaterName || 'ThauFilm Cinema'} • {booking.roomName}</Typography>
                    <Typography color="text.secondary">
                      {formatShowDate(booking.startTime)}{formatShowTime(booking) ? ` • ${formatShowTime(booking)}` : ''}
                    </Typography>
                    <Typography sx={{ mt: 1, fontWeight: 700, color: 'primary.main' }}>
                      Ghế: {(booking.seats || []).map((seat) => seat.label).join(', ') || 'Đang cập nhật'}
                    </Typography>
                  </Box>
                  <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      {formatCurrency(booking.totalAmount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mã: {booking.confirmationCode}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button variant="outlined" onClick={() => navigate(`/my-bookings/${booking.id}`)}>
                        Xem chi tiết
                      </Button>
                      {canResumeBooking(booking) && (
                        <Button variant="contained" onClick={() => navigate('/payment', { state: toPaymentState(booking) })}>
                          Tiếp tục thanh toán
                        </Button>
                      )}
                      {isHoldBooking(booking) && !isHoldExpired(booking) && (
                        <Button color="error" variant="outlined" onClick={() => setCancelTarget(booking)}>
                          Hủy giữ ghế
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <ConfirmationDialog
        open={Boolean(cancelTarget)}
        title="Hủy giữ ghế?"
        description="Booking này sẽ bị hủy và các ghế đang giữ sẽ được trả lại cho suất chiếu."
        confirmText="Hủy giữ ghế"
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />
    </Container>
  );
};

export default MyBookingsPage;
