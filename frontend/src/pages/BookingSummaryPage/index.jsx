import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Alert, Typography, Checkbox, FormControlLabel, Button, Stack, Paper, Divider, Snackbar } from '@mui/material';
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

  useEffect(() => {
    let id = location.state?.bookingId;
    if (id) {
      setBookingId(id);
      sessionStorage.setItem('tf_booking_id', id);
    } else {
      const savedId = sessionStorage.getItem('tf_booking_id');
      if (savedId) {
        setBookingId(savedId);
      }
    }

    if (location.state?.movie) setMovie(location.state.movie);
    if (location.state?.showtime) setShowtime(location.state.showtime);
    if (location.state?.selectedSeats) setSelectedSeats(location.state.selectedSeats);
  }, [location.state]);

  useEffect(() => {
    if (bookingId) {
      getDetail(bookingId)
        .then((booking) => {
          if (booking) {
            if (!movie) {
              setMovie({
                title: booking.movieTitle,
                posterUrl: location.state?.movie?.posterUrl || '/placeholder.svg',
                genre: location.state?.movie?.genre || 'Đang cập nhật',
                durationMinutes: location.state?.movie?.durationMinutes || 120,
                ageRating: location.state?.movie?.ageRating,
              });
            }
            if (!showtime) {
              setShowtime({
                id: booking.showtimeId,
                time: new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                room: booking.roomName,
                format: location.state?.showtime?.format || '2D'
              });
            }
            if (selectedSeats.length === 0) {
              setSelectedSeats(booking.seats);
            }
          }
        })
        .catch(() => {
          setSnackbarOpen(true);
        });
    }
  }, [bookingId, getDetail]);

  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
  const serviceFee = 10000;
  const totalAmount = seatsTotal + serviceFee;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleProceedToPayment = () => {
    if (!agreedTerms || apiLoading) return;
    
    navigate('/booking/payment', {
      state: {
        bookingId,
        movie,
        showtime,
        selectedSeats
      }
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
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/movies')}
          sx={{ mt: 3, fontWeight: 700 }}
        >
          Quay lại trang phim
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      <LoadingOverlay open={apiLoading} message="Đang chuẩn bị thông tin..." blur />

      {/* Step Indicator */}
      <BookingStepper activeStep={2} />

      {/* Header */}
      <PageHeader
        title="Xác Nhận Đặt Vé"
        subtitle="Vui lòng kiểm tra kỹ các thông tin đặt vé trước khi tiến hành thanh toán."
        onBack={() => navigate(`/booking/seats/${showtime?.id || ''}`, { state: { movie, showtime } })}
      />

      <Grid container spacing={4}>
        {/* Left: Main Content */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            
            {/* Movie & Showtime Info Card */}
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
              <Grid container spacing={3}>
                {/* Poster */}
                <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Box
                    component="img"
                    src={movie?.posterUrl || '/placeholder.svg'}
                    alt={movie?.title}
                    sx={{
                      width: '100%',
                      maxWidth: 150,
                      aspectRatio: '2/3',
                      objectFit: 'cover',
                      borderRadius: 3,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                  />
                </Grid>
                
                {/* Details */}
                <Grid item xs={12} sm={8}>
                  <Stack spacing={2}>
                    {/* Age Rating + Title */}
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

                    {/* Showtime Info */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <CalendarTodayRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">Ngày chiếu</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {showtime?.date ? new Date(showtime.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <AccessTimeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">Suất chiếu</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {showtime?.time} • {showtime?.format || '2D'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <MeetingRoomRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary">Phòng chiếu</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {showtime?.room}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>

                    <Divider />

                    {/* Selected Seats */}
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
                              borderColor: seat.type === 'VIP' ? '#8B5CF6' : seat.type === 'DOUBLE' ? '#EC4899' : 'rgba(148,163,184,0.3)',
                              color: seat.type === 'VIP' ? '#A78BFA' : seat.type === 'DOUBLE' ? '#F472B6' : 'text.primary',
                              bgcolor: 'rgba(30, 41, 59, 0.3)'
                            }}
                          >
                            {seat.rowName}{seat.seatNumber} ({seat.type})
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </SectionCard>

            {/* Terms & Conditions */}
            <SectionCard title="Điều Khoản & Cam Kết">
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <ShieldRoundedIcon sx={{ color: 'primary.main', mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    Vé xem phim đang được đặt giữ tạm thời. Vui lòng hoàn tất thanh toán trước khi thời gian giữ vé kết thúc. Vé đã thanh toán không hỗ trợ đổi trả hoặc hoàn tiền.
                  </Typography>
                </Stack>
                <Divider />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
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
        </Grid>

        {/* Right: Payment Summary */}
        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              position: 'sticky',
              top: 96,
              p: 3,
              borderRadius: 4,
              bgcolor: 'background.paper',
              border: '1px solid rgba(148, 163, 184, 0.08)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: 'text.primary' }}>
              Chi Tiết Thanh Toán
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Tên phim:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>
                  {movie?.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Suất chiếu:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {showtime?.time} • {showtime?.format || '2D'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Phòng chiếu:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{showtime?.room}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Ghế đã chọn:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {selectedSeats.map((s) => `${s.rowName}${s.seatNumber}`).join(', ')}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Tổng giá vé:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(seatsTotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Phí tiện ích:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(serviceFee)}</Typography>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Số tiền cần thanh toán:</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                  {formatCurrency(totalAmount)}
                </Typography>
              </Box>

              <CustomButton
                fullWidth
                variant="primary"
                size="large"
                disabled={!agreedTerms || apiLoading}
                onClick={handleProceedToPayment}
                sx={{ py: 1.8, mt: 1 }}
              >
                Thanh toán
              </CustomButton>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar Alert for Errors */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="error" 
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
        >
          {apiError || 'Có lỗi xảy ra khi đồng bộ đơn giữ vé.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BookingSummaryPage;
