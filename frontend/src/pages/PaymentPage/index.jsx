import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Alert, Typography, Button, Stack, Card, CardContent, Divider, Snackbar } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

import BookingStepper from '../../components/BookingStepper';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import PaymentMethodCard from '../../components/PaymentMethodCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import CustomButton from '../../components/common/CustomButton';

import { useBooking } from '../../hooks/useBooking';

export const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { loading: apiLoading, error: apiError, clearError, pay } = useBooking();

  const [bookingId, setBookingId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('bank_card');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    let currentId = location.state?.bookingId;
    if (!currentId) {
      currentId = sessionStorage.getItem('tf_booking_id');
    }
    
    if (currentId && location.state?.movie && location.state?.showtime && location.state?.selectedSeats) {
      setBookingId(currentId);
      setMovie(location.state.movie);
      setShowtime(location.state.showtime);
      setSelectedSeats(location.state.selectedSeats);
    }
  }, [location.state]);

  useEffect(() => {
    if (apiError) {
      setSnackbarOpen(true);
    }
  }, [apiError]);

  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const serviceFee = 10000;
  const totalAmount = seatsTotal > 0 ? seatsTotal + serviceFee : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handlePay = async () => {
    if (!bookingId || apiLoading) return;
    
    try {
      // Map frontend payment method ID to backend payment method
      const paymentMethodMap = {
        'bank_card': 'VNPAY',
        'e_wallet': 'MOMO',
        'qr_pay': 'ZALOPAY',
      };
      const backendPaymentMethod = paymentMethodMap[paymentMethod] || 'CASH';
      
      // Confirm and finalize payment on the backend
      const result = await pay(bookingId, backendPaymentMethod);
      
      // Navigate to success, passing transaction details
      navigate('/booking/success', {
        state: {
          bookingId,
          movie,
          showtime,
          selectedSeats,
          paymentMethod,
          bookingCode: result?.confirmationCode || `TF-${Math.floor(100000 + Math.random() * 900000)}`,
          totalAmount
        }
      });
      
      // Clean up local booking reference on success
      sessionStorage.removeItem('tf_booking_id');
    } catch (err) {
      // Managed by useBooking and snackbar
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (!bookingId || !movie || !showtime || selectedSeats.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Không tìm thấy thông tin phiên đặt vé hợp lệ. Vui lòng thực hiện đặt vé lại.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/movies')}
          sx={{ mt: 3 }}
        >
          Quay lại trang chủ
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      {/* Loading overlay for payment processing API call */}
      <LoadingOverlay 
        open={apiLoading} 
        message="Đang thực hiện thanh toán... Vui lòng không đóng trình duyệt!" 
        blur 
        fullScreen 
      />

      {/* Steps Progress */}
      <BookingStepper activeStep={3} />

      {/* Header */}
      <PageHeader
        title="Thanh Toán Đơn Hàng"
        subtitle="Vui lòng lựa chọn phương thức thanh toán phù hợp."
        onBack={() => navigate('/booking/summary', { state: { bookingId, movie, showtime, selectedSeats } })}
      />

      <Grid container spacing={4}>
        {/* Left: Payment Selector */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <SectionCard title="Chọn Phương Thức Thanh Toán">
              <PaymentMethodCard 
                selectedMethodId={paymentMethod} 
                onSelectMethod={setPaymentMethod} 
              />
            </SectionCard>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', px: 1 }}>
              <LockIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Thông tin thanh toán được bảo mật theo tiêu chuẩn quốc tế PCI-DSS.
              </Typography>
            </Box>
          </Stack>
        </Grid>

        {/* Right: Summary Invoice */}
        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 4, 
              border: '1px solid rgba(148, 163, 184, 0.08)' 
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: 'text.primary' }}>
                Chi Tiết Thanh Toán
              </Typography>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tên phim:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', maxWidth: '70%' }}>{movie.title}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Suất chiếu:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{showtime.time} • {showtime.format}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Phòng chiếu:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{showtime.room}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Ghế đã chọn:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {selectedSeats.map((s) => s.label || s.id).join(', ')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Tổng giá vé:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(seatsTotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Phí tiện ích:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(serviceFee)}</Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Số tiền cần thanh toán:</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>{formatCurrency(totalAmount)}</Typography>
                </Box>

                <CustomButton
                  fullWidth
                  variant="primary"
                  size="large"
                  onClick={handlePay}
                  disabled={apiLoading}
                  sx={{ py: 1.8, mt: 2 }}
                >
                  Xác nhận thanh toán
                </CustomButton>
              </Stack>
            </CardContent>
          </Card>
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
          {apiError || 'Thanh toán không thành công. Vui lòng thử lại.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PaymentPage;
