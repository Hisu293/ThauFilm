import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Radio,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import FastfoodRoundedIcon from '@mui/icons-material/FastfoodRounded';

import BookingStepper from '../../components/BookingStepper';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import PaymentMethodCard from '../../components/PaymentMethodCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import CustomButton from '../../components/common/CustomButton';
import EmptyState from '../../components/common/EmptyState';
import { useBooking } from '../../hooks/useBooking';
import { bookingApi } from '../../api/bookingApi';
import { bookingService } from '../../services/bookingService';
import {
  getPendingBooking,
  mergeMovieContext,
  mergeShowtimeContext,
  removePendingBooking,
  savePendingBooking,
} from '../../utils/pendingBookingStorage';

const buildFallbackMovie = (booking) => ({
  title: booking.movieTitle,
  posterUrl: '/placeholder.svg',
});

const buildFallbackShowtime = (booking, showtimeState) => ({
  id: booking.showtimeId,
  date: booking.startTime ? String(booking.startTime).slice(0, 10) : '',
  time: booking.startTime ? String(booking.startTime).slice(11, 16) : '',
  room: booking.roomName,
  theaterName: showtimeState?.theaterName || '',
  format: showtimeState?.format || '2D',
  startTime: booking.startTime,
});

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDiscountLabel = (discount) => {
  if (discount.type === 'PERCENTAGE') {
    return `${discount.value}%`;
  }
  return formatCurrency(discount.value);
};

const isDiscountApplicable = (discount, subtotal) => subtotal >= (discount?.minPurchaseAmount || 0);

const getDiscountAmount = (discount, subtotal) => {
  if (!discount || !isDiscountApplicable(discount, subtotal)) return 0;

  const rawDiscount =
    discount.type === 'PERCENTAGE'
      ? (subtotal * (discount.value || 0)) / 100
      : Number(discount.value) || 0;

  if (discount.maxDiscountAmount > 0) {
    return Math.min(rawDiscount, discount.maxDiscountAmount, subtotal);
  }

  return Math.min(rawDiscount, subtotal);
};

export const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: apiLoading, error: apiError, clearError, getDetail, pay } = useBooking();

  const [bookingId, setBookingId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('bank_card');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [promotionNotice, setPromotionNotice] = useState('');

  useEffect(() => {
    let currentBookingId = location.state?.bookingId;
    if (!currentBookingId) {
      currentBookingId = sessionStorage.getItem('tf_booking_id');
    }

    if (currentBookingId) {
      setBookingId(currentBookingId);
    }

    const pendingContext = currentBookingId ? getPendingBooking(currentBookingId) : null;
    setMovie(mergeMovieContext(location.state?.movie, pendingContext?.movie));
    setShowtime(mergeShowtimeContext(location.state?.showtime, pendingContext?.showtime));
    setSelectedSeats(location.state?.selectedSeats || pendingContext?.selectedSeats || []);
    setHoldExpiresAt(location.state?.holdExpiresAt || pendingContext?.holdExpiresAt || null);
  }, [location.state]);

  useEffect(() => {
    if (!bookingId || (movie && showtime && selectedSeats.length > 0)) return;

    getDetail(bookingId)
      .then((booking) => {
        if (!booking) return;

        const pendingContext = getPendingBooking(booking.id);
        const mergedMovie = mergeMovieContext(
          pendingContext?.movie,
          location.state?.movie,
          movie,
          buildFallbackMovie(booking),
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
      })
      .catch(() => {
        setSnackbarOpen(true);
      });
  }, [bookingId, getDetail, location.state, movie, selectedSeats.length, showtime]);

  useEffect(() => {
    let active = true;

    const loadPromotions = async () => {
      setLoadingPromotions(true);
      try {
        const [discountRes, comboRes] = await Promise.allSettled([
          bookingApi.fetchActiveDiscounts(),
          bookingApi.fetchActiveCombos(),
        ]);

        if (!active) return;

        if (discountRes.status === 'fulfilled') {
          const rawDiscounts = discountRes.value?.data ?? discountRes.value ?? [];
          setDiscounts(bookingService.normalizeDiscounts(rawDiscounts));
        } else {
          setDiscounts([]);
        }

        if (comboRes.status === 'fulfilled') {
          const rawCombos = comboRes.value?.data ?? comboRes.value ?? [];
          setCombos(bookingService.normalizeCombos(rawCombos));
        } else {
          setCombos([]);
        }

        setPromotionNotice(
          'Ưu đãi đang được lấy từ API thật. Khi chọn mã, hệ thống sẽ tạm tính và trừ trực tiếp ở phần chi tiết thanh toán để bạn xem trước số tiền cần trả.',
        );
      } catch {
        if (!active) return;
        setDiscounts([]);
        setCombos([]);
      } finally {
        if (active) setLoadingPromotions(false);
      }
    };

    loadPromotions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (apiError) {
      setSnackbarOpen(true);
    }
  }, [apiError]);

  const selectedDiscount = useMemo(
    () => discounts.find((discount) => discount.id === selectedDiscountId) || null,
    [discounts, selectedDiscountId],
  );

  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
  const discountAmount = getDiscountAmount(selectedDiscount, seatsTotal);
  const totalAmount = Math.max(seatsTotal - discountAmount, 0);

  const handlePay = async () => {
    if (!bookingId || apiLoading) return;

    try {
      const paymentMethodMap = {
        bank_card: 'VNPAY',
        e_wallet: 'MOMO',
        qr_pay: 'ZALOPAY',
      };
      const backendPaymentMethod = paymentMethodMap[paymentMethod] || 'CASH';

      const result = await pay(bookingId, backendPaymentMethod);

      navigate('/booking/success', {
        state: {
          bookingId,
          movie,
          showtime,
          selectedSeats,
          paymentMethod,
          selectedDiscount,
          discountAmount,
          bookingCode: result?.booking?.confirmationCode || result?.confirmationCode || bookingId,
          tickets: result?.tickets || [],
          totalAmount,
        },
      });

      sessionStorage.removeItem('tf_booking_id');
      removePendingBooking(bookingId);
    } catch {
      // Error state is handled by useBooking and the snackbar.
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (apiLoading && bookingId && (!movie || !showtime || selectedSeats.length === 0)) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang tải thông tin thanh toán..." blur />
      </Box>
    );
  }

  if (!bookingId || !movie || !showtime || selectedSeats.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Không tìm thấy thông tin phiên đặt vé hợp lệ. Vui lòng thực hiện đặt vé lại.
        </Alert>
        <Button variant="contained" color="primary" onClick={() => navigate('/movies')} sx={{ mt: 3 }}>
          Quay lại trang chủ
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      <LoadingOverlay
        open={apiLoading}
        message="Đang thực hiện thanh toán... Vui lòng không đóng trình duyệt!"
        blur
        fullScreen
      />

      <BookingStepper activeStep={3} />

      <PageHeader
        title="Thanh Toán Đơn Hàng"
        subtitle="Chọn phương thức thanh toán và ưu đãi hiện có trước khi hoàn tất giao dịch."
        onBack={() =>
          navigate('/booking/summary', {
            state: { bookingId, movie, showtime, selectedSeats, holdExpiresAt },
          })
        }
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
            <SectionCard title="Chọn Phương Thức Thanh Toán">
              <PaymentMethodCard selectedMethodId={paymentMethod} onSelectMethod={setPaymentMethod} />
            </SectionCard>

            <SectionCard title="Chọn Khuyến Mãi">
              <Stack spacing={2.5}>
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  {promotionNotice || 'Danh sách ưu đãi đang đồng bộ từ API thành viên.'}
                </Alert>

                {loadingPromotions ? (
                  <LoadingOverlay open={true} message="Đang tải ưu đãi..." />
                ) : discounts.length === 0 && combos.length === 0 ? (
                  <EmptyState
                    title="Chưa có ưu đãi khả dụng"
                    description="Tài khoản của bạn hiện chưa có khuyến mãi hoặc combo nào đang hoạt động."
                  />
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                        <LocalOfferRoundedIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Mã giảm giá hiện có
                        </Typography>
                      </Stack>

                      <Stack spacing={1.5}>
                        <Card
                          onClick={() => setSelectedDiscountId('')}
                          sx={{
                            cursor: 'pointer',
                            border: selectedDiscountId === '' ? '2px solid #FBBF24' : '1px solid rgba(148, 163, 184, 0.1)',
                            bgcolor: selectedDiscountId === '' ? 'rgba(251, 191, 36, 0.04)' : 'background.default',
                          }}
                        >
                          <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Radio checked={selectedDiscountId === ''} onChange={() => setSelectedDiscountId('')} />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Không áp dụng mã giảm giá
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Tiếp tục thanh toán theo giá vé hiện tại.
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>

                        {discounts.map((discount) => {
                          const applicable = isDiscountApplicable(discount, seatsTotal);
                          const previewDiscount = getDiscountAmount(discount, seatsTotal);

                          return (
                            <Card
                              key={discount.id}
                              onClick={() => applicable && setSelectedDiscountId(discount.id)}
                              sx={{
                                cursor: applicable ? 'pointer' : 'not-allowed',
                                opacity: applicable ? 1 : 0.55,
                                border:
                                  selectedDiscountId === discount.id
                                    ? '2px solid #FBBF24'
                                    : '1px solid rgba(148, 163, 184, 0.1)',
                                bgcolor:
                                  selectedDiscountId === discount.id ? 'rgba(251, 191, 36, 0.04)' : 'background.default',
                              }}
                            >
                              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                  <Radio
                                    checked={selectedDiscountId === discount.id}
                                    onChange={() => applicable && setSelectedDiscountId(discount.id)}
                                    disabled={!applicable}
                                  />
                                  <Stack spacing={1} sx={{ flex: 1 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                                      <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                          {discount.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          Mã: {discount.code}
                                        </Typography>
                                      </Box>
                                      <Chip label={formatDiscountLabel(discount)} color="primary" size="small" />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                      Đơn tối thiểu {formatCurrency(discount.minPurchaseAmount)}
                                      {discount.maxDiscountAmount > 0 ? ` • Giảm tối đa ${formatCurrency(discount.maxDiscountAmount)}` : ''}
                                    </Typography>
                                    <Typography variant="body2" color={applicable ? 'primary.main' : 'warning.main'} sx={{ fontWeight: 600 }}>
                                      {applicable
                                        ? `Tạm giảm ${formatCurrency(previewDiscount)} cho đơn này`
                                        : 'Đơn hiện tại chưa đủ điều kiện áp dụng'}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    </Box>

                    <Box>
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                        <FastfoodRoundedIcon sx={{ color: '#93C5FD' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Combo bắp nước
                        </Typography>
                      </Stack>

                      {combos.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          Hiện tại chưa có combo nào đang mở bán cho tài khoản của bạn.
                        </Alert>
                      ) : (
                        <Stack spacing={1.5}>
                          {combos.map((combo) => (
                            <Card
                              key={combo.id}
                              sx={{
                                border: '1px solid rgba(148, 163, 184, 0.1)',
                                bgcolor: 'background.default',
                              }}
                            >
                              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                      {combo.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {combo.description || 'Combo hiện có trong hệ thống.'}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={combo.price > 0 ? formatCurrency(combo.price) : 'Đang cập nhật'}
                                    sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                                  />
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                )}
              </Stack>
            </SectionCard>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', px: 1 }}>
              <LockIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Thông tin thanh toán được bảo mật theo tiêu chuẩn quốc tế PCI-DSS.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ flex: '0 0 340px', width: { xs: '100%', lg: '340px' } }}>
          <Card
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 4,
              border: '1px solid rgba(148, 163, 184, 0.08)',
              position: { xs: 'static', lg: 'sticky' },
              top: 96,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, color: 'text.primary' }}>
                Chi Tiết Thanh Toán
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tên phim:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', maxWidth: '70%' }}>
                    {movie.title}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Suất chiếu:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {showtime.time} • {showtime.format}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Phòng chiếu:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {showtime.room}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Ghế đã chọn:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {selectedSeats.map((seat) => seat.label || `${seat.rowName}${seat.seatNumber}` || seat.id).join(', ')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng giá vé:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(seatsTotal)}
                  </Typography>
                </Box>

                {selectedDiscount ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ưu đãi đã chọn:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', textAlign: 'right' }}>
                        {selectedDiscount.code}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Giảm trừ tạm tính:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        -{formatCurrency(discountAmount)}
                      </Typography>
                    </Box>
                  </>
                ) : null}

                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Số tiền thanh toán hiện tại:
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Tổng tiền trên giao diện đã được trừ theo khuyến mãi bạn chọn để bạn xem trước. Khi backend hỗ trợ payload ưu đãi,
                  phần submit sẽ nối tiếp vào cùng luồng này.
                </Typography>

                <CustomButton fullWidth variant="primary" size="large" onClick={handlePay} disabled={apiLoading} sx={{ py: 1.8, mt: 2 }}>
                  Xác nhận thanh toán
                </CustomButton>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {apiError || 'Thanh toán không thành công. Vui lòng thử lại.'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PaymentPage;
