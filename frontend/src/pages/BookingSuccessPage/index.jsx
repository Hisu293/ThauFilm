import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Stack, Grid, Divider, Paper, Snackbar, Alert } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';

import BookingStepper from '../../components/BookingStepper';
import SectionCard from '../../components/common/SectionCard';
import CustomButton from '../../components/common/CustomButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';

import { useBooking } from '../../hooks/useBooking';

export const BookingSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { loading: apiLoading, error: apiError, clearError, getTickets } = useBooking();

  const [bookingData, setBookingData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (location.state) {
      Promise.resolve().then(() => {
        setBookingData(location.state);
        if (Array.isArray(location.state.tickets)) {
          setTickets(location.state.tickets);
        }
      });
    }
  }, [location.state]);

  // Load ticket details via API: GET /api/member/booking/{bookingId}/tickets
  useEffect(() => {
    if (bookingData?.bookingId && tickets.length === 0) {
      getTickets(bookingData.bookingId)
        .then((ticketList) => {
          setTickets(ticketList);
        })
        .catch(() => {
          setSnackbarOpen(true);
        });
    }
  }, [bookingData?.bookingId, getTickets, tickets.length]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getMethodName = (id) => {
    switch (id) {
      case 'bank_card':
        return 'Thẻ ngân hàng (ATM/Visa/Mastercard)';
      case 'e_wallet':
        return 'Ví điện tử (Momo/ZaloPay)';
      case 'qr_pay':
        return 'Quét mã QR';
      default:
        return 'Thanh toán trực tuyến';
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (apiLoading && tickets.length === 0) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang tải vé xem phim..." blur />
      </Box>
    );
  }

  if (!bookingData) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Đặt Vé Thành Công!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Cảm ơn bạn đã mua vé xem phim tại hệ thống của chúng tôi.
        </Typography>
        <CustomButton variant="primary" onClick={() => navigate('/')}>
          Quay lại trang chủ
        </CustomButton>
      </Container>
    );
  }

  const { movie, showtime, selectedSeats, bookingCode, totalAmount, paymentMethod } = bookingData;
  const theaterName = showtime?.theaterName || showtime?.cinemaName || 'ThauFilm Cinema';

  const showDate = showtime?.date || (showtime?.startTime ? String(showtime.startTime).slice(0, 10) : '');
  const formattedDate = showDate
    ? new Date(`${showDate}T00:00:00`).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '';

  return (
    <Container maxWidth="md" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      <LoadingOverlay open={apiLoading} message="Đang nạp dữ liệu..." blur />

      {/* Step Indicator */}
      <BookingStepper activeStep={4} />

      {/* Success Badge */}
      <Box sx={{ textAlign: 'center', mb: 5, mt: 2 }}>
        <CheckCircleRoundedIcon 
          sx={{ 
            fontSize: 76, 
            color: '#10B981', 
            mb: 1.5,
            filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))'
          }} 
        />
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
          Đặt Vé Thành Công
        </Typography>
        <Typography color="text.secondary" variant="body1">
          Giao dịch của bạn đã được thực hiện thành công. Cảm ơn bạn đã đồng hành cùng ThauFilm!
        </Typography>
      </Box>

      {/* Ticket Layout Card */}
      <SectionCard sx={{ border: '2px solid rgba(251, 191, 36, 0.2)', position: 'relative' }}>
        {/* Ticket perforation side dots */}
        <Box 
          sx={{ 
            position: 'absolute', 
            left: -12, 
            top: '55%', 
            width: 24, 
            height: 24, 
            borderRadius: '50%', 
            bgcolor: 'background.default', 
            borderRight: '1px solid rgba(148, 163, 184, 0.08)',
            zIndex: 3
          }} 
        />
        <Box 
          sx={{ 
            position: 'absolute', 
            right: -12, 
            top: '55%', 
            width: 24, 
            height: 24, 
            borderRadius: '50%', 
            bgcolor: 'background.default', 
            borderLeft: '1px solid rgba(148, 163, 184, 0.08)',
            zIndex: 3
          }} 
        />

        {/* Booking code — full width, perfectly centered */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mb: 4,
            py: 3,
            px: 2,
            borderRadius: 3,
            border: '1px dashed rgba(251, 191, 36, 0.35)',
            bgcolor: 'rgba(251, 191, 36, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
          }}
        >
          <ConfirmationNumberRoundedIcon sx={{ color: 'primary.main', fontSize: 30 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            Mã đặt vé (Booking Code)
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: '0.18em', lineHeight: 1, pl: '0.18em' }}
          >
            {bookingCode}
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
          {/* Left: summary info */}
          <Grid item xs={12} md={7.5}>
            <Stack spacing={2.5}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  Tên Phim
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {movie?.title}
                </Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Rạp chiếu
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {theaterName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Phòng chiếu
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {showtime?.room}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Ngày chiếu
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                    {formattedDate || 'Hôm nay'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Suất chiếu
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {showtime?.time} ({showtime?.format})
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Danh sách ghế
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {selectedSeats.map((s) => s.label || s.id).join(', ')}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Phương thức</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{getMethodName(paymentMethod)}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">Tổng cộng</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Grid>

          {/* Right: barcode scanner verification */}
          <Grid item xs={12} md={4.5} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ borderLeft: { md: '1px dashed rgba(148, 163, 184, 0.12)' }, pl: { md: 4 }, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              <Paper 
                variant="outlined"
                sx={{ 
                  p: 2, 
                  bgcolor: '#FFF', 
                  borderRadius: 3, 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                }}
              >
                {/* SVG QR layout */}
                <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="30" height="30" stroke="#0F172A" strokeWidth="6" />
                  <rect x="20" y="20" width="10" height="10" fill="#0F172A" />
                  
                  <rect x="100" y="10" width="30" height="30" stroke="#0F172A" strokeWidth="6" />
                  <rect x="110" y="20" width="10" height="10" fill="#0F172A" />
                  
                  <rect x="10" y="100" width="30" height="30" stroke="#0F172A" strokeWidth="6" />
                  <rect x="20" y="110" width="10" height="10" fill="#0F172A" />
                  
                  <rect x="50" y="10" width="10" height="10" fill="#0F172A" />
                  <rect x="70" y="10" width="20" height="10" fill="#0F172A" />
                  <rect x="50" y="30" width="10" height="20" fill="#0F172A" />
                  <rect x="80" y="30" width="10" height="10" fill="#0F172A" />
                  <rect x="110" y="50" width="20" height="10" fill="#0F172A" />
                  <rect x="10" y="60" width="20" height="10" fill="#0F172A" />
                  <rect x="40" y="60" width="30" height="10" fill="#0F172A" />
                  <rect x="80" y="60" width="10" height="20" fill="#0F172A" />
                  <rect x="100" y="70" width="10" height="20" fill="#0F172A" />
                  <rect x="20" y="80" width="10" height="10" fill="#0F172A" />
                  <rect x="50" y="80" width="20" height="10" fill="#0F172A" />
                  <rect x="120" y="80" width="10" height="10" fill="#0F172A" />
                  <rect x="50" y="100" width="10" height="10" fill="#0F172A" />
                  <rect x="70" y="100" width="10" height="30" fill="#0F172A" />
                  <rect x="90" y="110" width="20" height="10" fill="#0F172A" />
                  <rect x="120" y="110" width="10" height="20" fill="#0F172A" />
                  <rect x="50" y="120" width="20" height="10" fill="#0F172A" />
                  <rect x="100" y="120" width="10" height="10" fill="#0F172A" />
                </svg>
              </Paper>
              
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', px: 2 }}>
                Đưa mã QR này cho nhân viên tại quầy vé hoặc quét tại máy soát vé để in vé cứng của bạn.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Home / ticket list navigation */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 5 }}>
        <CustomButton 
          variant="outlined" 
          onClick={() => navigate('/')}
          sx={{ px: 4 }}
        >
          Về trang chủ
        </CustomButton>
        <CustomButton 
          variant="primary" 
          onClick={() => navigate('/my-bookings')}
          sx={{ px: 4 }}
        >
          Xem vé của tôi
        </CustomButton>
      </Stack>

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
          {apiError || 'Có lỗi xảy ra khi đồng bộ danh sách vé.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BookingSuccessPage;
