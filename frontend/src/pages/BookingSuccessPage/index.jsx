import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Box, Typography, Stack, Divider, Paper, Snackbar, Alert } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';

import BookingStepper from '../../components/BookingStepper';
import SectionCard from '../../components/common/SectionCard';
import CustomButton from '../../components/common/CustomButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';

import { useBooking } from '../../hooks/useBooking';
import { useBookingNavigate } from '../../context/BookingNavigationContext';
import { savePaidBookingSummary } from '../../utils/paidBookingStorage';

export const BookingSuccessPage = () => {
  const location = useLocation();
  const navigate = useBookingNavigate();

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

  useEffect(() => {
    if (!bookingData?.bookingId) return;

    savePaidBookingSummary(bookingData.bookingId, {
      originalAmount: bookingData.originalAmount ?? bookingData.totalAmount,
      discountAmount: bookingData.discountAmount,
      finalAmount: bookingData.totalAmount,
      discountCode: bookingData.selectedDiscount?.code || '',
      paymentMethod: bookingData.paymentMethod,
    });
  }, [bookingData]);

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
  const originalAmount = Number(bookingData.originalAmount ?? totalAmount) || 0;
  const discountAmount = Number(bookingData.discountAmount) || 0;
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

        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, alignItems: 'center' }}>
          {/* Tên phim — căn giữa khung, nổi bật */}
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.1em' }}>
              Tên Phim
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
              {movie?.title}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', width: '100%' }} />

          {/* Chi tiết suất chiếu — chia đều, cách đều, căn giữa */}
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            {[
              { label: 'Rạp chiếu', value: theaterName },
              { label: 'Phòng chiếu', value: showtime?.room, highlight: true },
              { label: 'Ngày chiếu', value: formattedDate || 'Hôm nay', capitalize: true },
              { label: 'Suất chiếu', value: `${showtime?.time ?? ''} (${showtime?.format ?? ''})` },
              { label: 'Danh sách ghế', value: selectedSeats.map((s) => s.label || s.id).join(', '), highlight: true },
            ].map((field) => (
              <Box key={field.label} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {field.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: field.highlight ? 800 : 700,
                    color: field.highlight ? 'primary.main' : 'text.primary',
                    textTransform: field.capitalize ? 'capitalize' : 'none',
                  }}
                >
                  {field.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', width: '100%' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Phương thức</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{getMethodName(paymentMethod)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              {discountAmount > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Tổng giá vé: {formatCurrency(originalAmount)}
                  </Typography>
                  <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 700 }}>
                    Giảm giá: -{formatCurrency(discountAmount)}
                  </Typography>
                </>
              )}
              <Typography variant="caption" color="text.secondary">Số tiền đã thanh toán</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {formatCurrency(totalAmount)}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed', width: '100%' }} />

          {/* Mã QR — căn giữa khung vé */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
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

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', px: 2, maxWidth: 360 }}>
                Đưa mã QR này cho nhân viên tại quầy vé hoặc quét tại máy soát vé để in vé cứng của bạn.
              </Typography>
            </Box>
        </Stack>
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
