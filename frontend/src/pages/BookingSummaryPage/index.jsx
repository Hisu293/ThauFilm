import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Alert, Typography, Checkbox, FormControlLabel, Button, Stack, Paper, Divider, Snackbar } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';

import BookingStepper from '../../components/BookingStepper';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import BookingSidebar from '../../components/BookingSidebar';
import CustomButton from '../../components/common/CustomButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';

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

  // Stash bookingId in sessionStorage to prevent state loss on refresh
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

  // Load details from GET /api/member/booking/{bookingId}
  useEffect(() => {
    if (bookingId) {
      getDetail(bookingId)
        .then((booking) => {
          // If movie or showtime is missing (e.g., page refresh), rebuild from booking API details
          if (booking) {
            if (!movie) {
              setMovie({
                title: booking.movieTitle,
                posterUrl: location.state?.movie?.posterUrl || '/placeholder.svg',
                genre: location.state?.movie?.genre || 'Đang cập nhật',
                durationMinutes: location.state?.movie?.durationMinutes || 120,
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
        {/* Left Side: Summary components */}
        <Grid item xs={12} lg={8}>
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
                    Thay đổi ghế
                  </Button>
                )
              }
            >
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box
                    component="img"
                    src={movie?.posterUrl || '/placeholder.svg'}
                    alt={movie?.title}
                    sx={{
                      width: '100%',
                      maxWidth: 160,
                      aspectRatio: '2/3',
                      objectFit: 'cover',
                      borderRadius: 3,
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={8}>
                  <Stack spacing={2}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {movie?.title}
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Thể loại</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{movie?.genre}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Thời lượng</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{movie?.durationMinutes || movie?.duration} phút</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Phòng chiếu</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{showtime?.room}</Typography>
                      </Grid>
                    </Grid>

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">Ghế ngồi đã đặt giữ</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                        {selectedSeats.map((seat) => (
                          <Paper
                            key={seat.id}
                            variant="outlined"
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              fontWeight: 800,
                              borderColor: seat.type === 'VIP' ? '#8B5CF6' : seat.type === 'DOUBLE' ? '#EC4899' : 'rgba(148,163,184,0.3)',
                              color: seat.type === 'VIP' ? '#A78BFA' : seat.type === 'DOUBLE' ? '#F472B6' : 'text.primary',
                              bgcolor: 'rgba(30, 41, 59, 0.3)'
                            }}
                          >
                            {seat.label || seat.id} ({seat.type})
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Điều Khoản & Cam Kết">
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <ShieldRoundedIcon sx={{ color: 'primary.main', mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    Vé xem phim đã chọn đang được đặt giữ tạm thời. Vui lòng hoàn tất thanh toán trước khi thời gian giữ vé kết thúc. Vé đã thanh toán không hỗ trợ đổi trả hoặc hoàn tiền.
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

        {/* Right Side: sidebar calculations */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {movie && showtime && (
              <BookingSidebar
                movie={movie}
                showtime={showtime}
                selectedSeats={selectedSeats}
                showSummaryOnly={true}
              />
            )}
            
            <CustomButton
              fullWidth
              variant="primary"
              size="large"
              disabled={!agreedTerms || apiLoading}
              onClick={handleProceedToPayment}
              sx={{ py: 1.8 }}
            >
              Thanh toán
            </CustomButton>
          </Stack>
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
