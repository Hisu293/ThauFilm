import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';

import BookingStepper from '../../components/BookingStepper';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import CustomButton from '../../components/common/CustomButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import StatusChip from '../../components/common/StatusChip';
import { useBooking } from '../../hooks/useBooking';
import { useHoldCountdown } from '../../hooks/useHoldCountdown';
import {
  getPendingBooking,
  mergeMovieContext,
  mergeShowtimeContext,
  pruneExpiredPendingBookings,
  removePendingBooking,
  savePendingBooking,
} from '../../utils/pendingBookingStorage';

const buildFallbackMovie = (booking, movieState) => ({
  title: booking.movieTitle,
  posterUrl: '/placeholder.svg',
  genre: movieState?.genre || 'Đang cập nhật',
  durationMinutes: movieState?.durationMinutes || 120,
  ageRating: movieState?.ageRating || '',
});

const buildFallbackShowtime = (booking, showtimeState) => ({
  id: booking.showtimeId,
  date: booking.startTime ? String(booking.startTime).slice(0, 10) : '',
  time: booking.startTime
    ? new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '',
  room: booking.roomName,
  theaterName: showtimeState?.theaterName || '',
  format: showtimeState?.format || '2D',
  startTime: booking.startTime,
});

export const BookingSummaryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: apiLoading, error: apiError, clearError, getDetail } = useBooking();

  const [bookingId, setBookingId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);

  const { remainingText, isExpired } = useHoldCountdown(holdExpiresAt);

  useEffect(() => {
    pruneExpiredPendingBookings();

    let currentBookingId = location.state?.bookingId;
    if (!currentBookingId) {
      currentBookingId = sessionStorage.getItem('tf_booking_id');
    }

    if (currentBookingId) {
      setBookingId(currentBookingId);
      sessionStorage.setItem('tf_booking_id', currentBookingId);
    }

    const pendingContext = currentBookingId ? getPendingBooking(currentBookingId) : null;
    setMovie(mergeMovieContext(location.state?.movie, pendingContext?.movie));
    setShowtime(mergeShowtimeContext(location.state?.showtime, pendingContext?.showtime));
    setSelectedSeats(location.state?.selectedSeats || pendingContext?.selectedSeats || []);
    setHoldExpiresAt(location.state?.holdExpiresAt || pendingContext?.holdExpiresAt || null);
  }, [location.state]);

  useEffect(() => {
    if (!bookingId) return;

    getDetail(bookingId)
      .then((booking) => {
        if (!booking) return;

        const pendingContext = getPendingBooking(booking.id);
        const mergedMovie = mergeMovieContext(
          pendingContext?.movie,
          location.state?.movie,
          movie,
          buildFallbackMovie(booking, location.state?.movie),
        );
        const mergedShowtime = mergeShowtimeContext(
          pendingContext?.showtime,
          location.state?.showtime,
          showtime,
          buildFallbackShowtime(booking, location.state?.showtime),
        );

        setHoldExpiresAt(booking.holdExpiresAt || null);
        setMovie(mergedMovie);
        setShowtime(mergedShowtime);
        setSelectedSeats((current) => (current.length > 0 ? current : booking.seats || []));

        savePendingBooking({
          id: booking.id,
          movie: mergedMovie,
          showtime: mergedShowtime,
          selectedSeats: booking.seats || [],
          holdExpiresAt: booking.holdExpiresAt,
          confirmationCode: booking.confirmationCode,
        });

        if (booking.status === 'CANCELLED' || booking.status === 'CONFIRMED') {
          removePendingBooking(booking.id);
        }
      })
      .catch(() => {
        setSnackbarOpen(true);
      });
  }, [bookingId, getDetail, location.state]);

  useEffect(() => {
    if (bookingId && isExpired) {
      removePendingBooking(bookingId);
      sessionStorage.removeItem('tf_booking_id');
    }
  }, [bookingId, isExpired]);

  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
  const totalAmount = seatsTotal;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const handleProceedToPayment = () => {
    if (!agreedTerms || apiLoading || isExpired) return;

    navigate('/booking/payment', {
      state: {
        bookingId,
        movie,
        showtime,
        selectedSeats,
        holdExpiresAt,
      },
    });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (apiLoading && selectedSeats.length === 0) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang tải chi tiết đơn hàng..." blur />
      </Box>
    );
  }

  if (!bookingId) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Phiên đặt vé đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện đặt vé lại.
        </Alert>
        <Button variant="contained" color="primary" onClick={() => navigate('/movies')} sx={{ mt: 3, fontWeight: 700 }}>
          Quay lại trang phim
        </Button>
      </Container>
    );
  }

  if (isExpired) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          Phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế để tiếp tục đặt vé.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(`/booking/seats/${showtime?.id || ''}`, { state: { movie, showtime } })}
          sx={{ mt: 3, fontWeight: 700 }}
        >
          Chọn ghế lại
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      <LoadingOverlay open={apiLoading} message="Đang chuẩn bị thông tin..." blur />

      <BookingStepper activeStep={2} />

      <PageHeader
        title="Xác Nhận Đặt Vé"
        subtitle="Vui lòng kiểm tra kỹ các thông tin đặt vé trước khi tiến hành thanh toán."
        onBack={() => navigate(`/booking/seats/${showtime?.id || ''}`, { state: { movie, showtime } })}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 4,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box sx={{ flex: '1 1 65%', minWidth: 0 }}>
          <Stack spacing={3}>
            <SectionCard
              title="Thông Tin Vé Đã Chọn"
              action={
                showtime?.id && (
                  <Button
                    startIcon={<EditRoundedIcon />}
                    onClick={() => navigate(`/booking/seats/${showtime.id}`, { state: { movie, showtime } })}
                    sx={{ color: 'primary.main', fontWeight: 700 }}
                  >
                    Thay đổi
                  </Button>
                )
              }
            >
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: 'rgba(251, 191, 36, 0.12)',
                  color: 'text.primary',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                Ghế đang được giữ cho bạn. Vui lòng hoàn tất thanh toán trong <strong>{remainingText}</strong>.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, flexShrink: 0 }}>
                  <Box
                    component="img"
                    src={movie?.posterUrl || movie?.poster || '/placeholder.svg'}
                    alt={movie?.title}
                    sx={{
                      width: '100%',
                      maxWidth: 150,
                      aspectRatio: '2/3',
                      objectFit: 'cover',
                      borderRadius: 3,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    }}
                  />
                </Box>

                <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                  <Box>
                    {movie?.ageRating && <StatusChip label={movie.ageRating} type="age" sx={{ mb: 1 }} />}
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
                      {movie?.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {movie?.genre} • {movie?.durationMinutes || 120} phút
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CalendarTodayRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Ngày chiếu
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {showtime?.date
                            ? new Date(showtime.date).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <AccessTimeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Suất chiếu
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {showtime?.time} • {showtime?.format || '2D'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <MeetingRoomRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Phòng chiếu
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {showtime?.room}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Ghế đã đặt giữ:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedSeats.map((seat) => (
                        <Paper
                          key={seat.id}
                          variant="outlined"
                          sx={{
                            px: 2,
                            py: 0.75,
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: 'body2',
                            borderColor:
                              seat.type === 'VIP'
                                ? '#8B5CF6'
                                : seat.type === 'DOUBLE'
                                  ? '#EC4899'
                                  : 'rgba(148,163,184,0.3)',
                            color:
                              seat.type === 'VIP'
                                ? '#A78BFA'
                                : seat.type === 'DOUBLE'
                                  ? '#F472B6'
                                  : 'text.primary',
                            bgcolor: 'rgba(30, 41, 59, 0.3)',
                          }}
                        >
                          {seat.rowName}
                          {seat.seatNumber} ({seat.type})
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </SectionCard>

            <SectionCard title="Điều Khoản & Cam Kết">
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <ShieldRoundedIcon sx={{ color: 'primary.main', mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    Vé xem phim đang được đặt giữ tạm thời. Vui lòng hoàn tất thanh toán trước khi thời gian giữ vé kết thúc.
                    Vé đã thanh toán không hỗ trợ đổi trả hoặc hoàn tiền.
                  </Typography>
                </Stack>
                <Divider />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={agreedTerms}
                      onChange={(event) => setAgreedTerms(event.target.checked)}
                      disabled={apiLoading}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Tôi đồng ý với điều khoản sử dụng và hoàn toàn chịu trách nhiệm về tính xác thực của thông tin đặt vé.
                    </Typography>
                  }
                />
              </Stack>
            </SectionCard>
          </Stack>
        </Box>

        <Box sx={{ flex: '0 0 340px', width: { xs: '100%', lg: '340px' } }}>
          <Paper
            sx={{
              position: { xs: 'static', lg: 'sticky' },
              top: 96,
              p: 3,
              borderRadius: 4,
              bgcolor: 'background.paper',
              border: '1px solid rgba(148, 163, 184, 0.08)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: 'text.primary' }}>
              Chi Tiết Thanh Toán
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Tên phim:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>
                  {movie?.title}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Suất chiếu:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {showtime?.time} • {showtime?.format || '2D'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Phòng chiếu:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {showtime?.room}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Ghế đã chọn:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {selectedSeats.map((seat) => `${seat.rowName}${seat.seatNumber}`).join(', ')}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Tổng giá vé:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(seatsTotal)}
                </Typography>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Số tiền cần thanh toán:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                  {formatCurrency(totalAmount)}
                </Typography>
              </Box>

              <CustomButton
                fullWidth
                variant="primary"
                size="large"
                disabled={!agreedTerms || apiLoading || isExpired}
                onClick={handleProceedToPayment}
                sx={{ py: 1.8, mt: 1 }}
              >
                {isExpired ? 'Phiên giữ ghế đã hết hạn' : 'Thanh toán'}
              </CustomButton>
            </Stack>
          </Paper>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {apiError || 'Có lỗi xảy ra khi đồng bộ đơn giữ vé.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BookingSummaryPage;
