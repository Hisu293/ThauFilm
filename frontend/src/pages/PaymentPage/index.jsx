import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
import { useBookingFlow } from '../../context/BookingContext';
import { useHoldCountdown } from '../../hooks/useHoldCountdown';
import { bookingApi } from '../../api/bookingApi';
import { bookingService } from '../../services/bookingService';
import {
  getPendingBooking,
  mergeMovieContext,
  mergeShowtimeContext,
  removePendingBooking,
  savePendingBooking,
} from '../../utils/pendingBookingStorage';
import {
  getSavedDiscountCodes,
  markDiscountCodeUnavailable,
  saveBookingReplacement,
  savePaidBookingSummary,
} from '../../utils/paidBookingStorage';

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

const parseApplicableSeatTypes = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const seatMatchesDiscount = (discount, selectedSeats = []) => {
  const allowedTypes = parseApplicableSeatTypes(discount.applicableSeatTypes);
  if (allowedTypes.length === 0) return true;

  const selectedTypes = selectedSeats
    .map((seat) => String(seat.type || '').trim().toUpperCase())
    .filter(Boolean);
  if (selectedTypes.length === 0) return false;

  return selectedTypes.some((type) => allowedTypes.includes(type));
};

const isDiscountApplicable = (discount, subtotal, usedCodes = new Set(), selectedSeats = []) => {
  if (!discount || discount.active === false || subtotal < (discount.minPurchaseAmount || 0)) return false;
  if (!['FIXED', 'PERCENTAGE'].includes(discount.type) || discount.value <= 0) return false;
  if (discount.usageLimit > 0 && discount.usageCount >= discount.usageLimit) return false;
  if (usedCodes.has(String(discount.code || '').trim().toUpperCase())) return false;
  if (!seatMatchesDiscount(discount, selectedSeats)) return false;

  const now = Date.now();
  const validFrom = discount.validFrom ? new Date(discount.validFrom).getTime() : null;
  const validTo = discount.validTo ? new Date(discount.validTo).getTime() : null;
  if (Number.isFinite(validFrom) && now < validFrom) return false;
  if (Number.isFinite(validTo) && now > validTo) return false;
  return true;
};

const getDiscountAmount = (discount, subtotal) => {
  if (!discount) return 0;

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
  const { loading: apiLoading, error: apiError, clearError, getDetail, getTickets, create, pay, cancel } = useBooking();
  const { updateBookingState, clearBookingState } = useBookingFlow();

  const [bookingId, setBookingId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('qr_pay');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [promotionNotice, setPromotionNotice] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingOriginalAmount, setBookingOriginalAmount] = useState(null);
  const [invalidBookingMessage, setInvalidBookingMessage] = useState('');
  const paymentInFlight = useRef(false);
  const { isExpired } = useHoldCountdown(holdExpiresAt);
  const isHoldExpired = Boolean(holdExpiresAt) && isExpired;

  useEffect(() => {
    let currentBookingId = location.state?.bookingId;
    if (!currentBookingId) {
      currentBookingId = sessionStorage.getItem('tf_booking_id');
    }

    const pendingContext = currentBookingId ? getPendingBooking(currentBookingId) : null;
    Promise.resolve().then(() => {
      if (currentBookingId) {
        setBookingId(currentBookingId);
      }
      setMovie(mergeMovieContext(location.state?.movie, pendingContext?.movie));
      setShowtime(mergeShowtimeContext(location.state?.showtime, pendingContext?.showtime));
      setSelectedSeats(location.state?.selectedSeats || pendingContext?.selectedSeats || []);
      setHoldExpiresAt(location.state?.holdExpiresAt || pendingContext?.holdExpiresAt || null);
    });
  }, [location.state]);

  useEffect(() => {
    if (!bookingId) return;

    getDetail(bookingId)
      .then((booking) => {
        if (!booking) return;
        const normalizedStatus = String(booking.status || '').toUpperCase();
        setBookingStatus(normalizedStatus);
        setBookingOriginalAmount(Number(booking.totalAmount) || 0);

        if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'EXPIRED') {
          removePendingBooking(booking.id);
          sessionStorage.removeItem('tf_booking_id');
          clearBookingState();
          setInvalidBookingMessage('Booking này đã bị hủy hoặc hết hạn giữ ghế. Vui lòng đặt vé lại.');
          return;
        }

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
        setMovie((current) => current || mergedMovie);
        setShowtime((current) => current || mergedShowtime);
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
  }, [bookingId, clearBookingState, getDetail, location.state]);

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
      Promise.resolve().then(() => setSnackbarOpen(true));
    }
  }, [apiError]);
  const selectedSeatsTotal = selectedSeats.reduce(
    (sum, seat) => sum + (Number(seat.price) || 0),
    0,
  );
  const seatsTotal = bookingOriginalAmount !== null
    ? Number(bookingOriginalAmount)
    : selectedSeatsTotal;
  const availableCombos = useMemo(
    () => combos.filter((combo) => combo.active !== false && combo.id && combo.price > 0),
    [combos],
  );
  const selectedCombos = useMemo(
    () => availableCombos.filter((combo) => selectedComboIds.includes(combo.id)),
    [availableCombos, selectedComboIds],
  );
  const comboTotal = selectedCombos.reduce((sum, combo) => sum + (Number(combo.price) || 0), 0);
  const subtotal = seatsTotal + comboTotal;
  const usedDiscountCodes = getSavedDiscountCodes();
  const availableDiscounts = discounts.filter((discount) => isDiscountApplicable(discount, subtotal, usedDiscountCodes, selectedSeats));
  const selectedDiscount = availableDiscounts.find((discount) => discount.id === selectedDiscountId) || null;
  const discountAmount = getDiscountAmount(selectedDiscount, subtotal);
  const totalAmount = Math.max(subtotal - discountAmount, 0);

  const toggleCombo = (comboId) => {
    setSelectedComboIds((current) =>
      current.includes(comboId) ? current.filter((id) => id !== comboId) : [...current, comboId],
    );
  };

  const goToSuccess = (paymentResult = {}, overrides = {}, paidBookingId = bookingId) => {
    const confirmedBooking = paymentResult?.booking || overrides.booking || null;
    const confirmedTickets = paymentResult?.tickets || overrides.tickets || [];
    const paidAmount = Number(paymentResult?.finalAmount ?? paymentResult?.payment?.amount ?? totalAmount);
    const paidOriginalAmount = Number(paymentResult?.originalAmount ?? subtotal);
    const paidDiscountAmount = Number(paymentResult?.discountAmount ?? discountAmount);

    savePaidBookingSummary(paidBookingId, {
      originalAmount: paidOriginalAmount,
      discountAmount: paidDiscountAmount,
      finalAmount: Number.isFinite(paidAmount) ? paidAmount : totalAmount,
      discountCode: paymentResult?.discountCode || selectedDiscount?.code || '',
      paymentMethod,
    });

    navigate('/booking/success', {
      state: {
        bookingId: paidBookingId,
        movie,
        showtime,
      selectedSeats,
      paymentMethod,
      selectedDiscount,
      originalAmount: paidOriginalAmount,
      discountAmount: paidDiscountAmount,
      bookingCode: confirmedBooking?.confirmationCode || paymentResult?.confirmationCode || bookingId,
        tickets: confirmedTickets,
        totalAmount: Number.isFinite(paidAmount) ? paidAmount : totalAmount,
      },
    });

    updateBookingState({ bookingId: paidBookingId, paymentStatus: 'PAID' });
    sessionStorage.removeItem('tf_booking_id');
    removePendingBooking(paidBookingId);
    clearBookingState();
  };

  const handlePay = async () => {
    if (!bookingId || apiLoading || paymentInFlight.current) return;
    if (bookingStatus && !['HOLD', 'PENDING'].includes(bookingStatus)) {
      setInvalidBookingMessage('Booking này không còn ở trạng thái chờ thanh toán. Vui lòng kiểm tra lại trong Vé của tôi.');
      return;
    }
    if (isHoldExpired) {
      setSnackbarOpen(true);
      return;
    }

    let payableBookingId = bookingId;
    paymentInFlight.current = true;

    try {
      const paymentMethodMap = {
        bank_card: 'PAYOS',
        e_wallet: 'PAYOS',
        qr_pay: 'PAYOS',
      };
      const backendPaymentMethod = paymentMethodMap[paymentMethod] || 'CASH';
      const discountCode = selectedDiscount?.code || '';
      updateBookingState({ bookingId, paymentStatus: 'PAYING' });

      if (selectedComboIds.length > 0) {
        const seatIds = selectedSeats.map((seat) => seat.id).filter(Boolean);
        const showtimeId = showtime?.id;
        if (!showtimeId || seatIds.length === 0) {
          throw new Error('Không đủ thông tin để thêm combo vào booking.');
        }

        await cancel(bookingId);
        removePendingBooking(bookingId);

        const replacementBooking = await create(showtimeId, seatIds, 'ONLINE', selectedComboIds);
        payableBookingId = replacementBooking.id;
        setBookingOriginalAmount(Number(replacementBooking.totalAmount) || subtotal);
        saveBookingReplacement(bookingId, payableBookingId);
        setBookingId(payableBookingId);
        sessionStorage.setItem('tf_booking_id', payableBookingId);
        updateBookingState({ bookingId: payableBookingId, paymentStatus: 'PAYING' });
        savePendingBooking({
          id: payableBookingId,
          movie,
          showtime,
          selectedSeats,
          holdExpiresAt: replacementBooking.holdExpiresAt,
          confirmationCode: replacementBooking.confirmationCode,
        });
      }

      const result = await pay(payableBookingId, backendPaymentMethod, discountCode);
      const checkoutUrl = result?.checkoutUrl || result?.payment?.checkoutUrl;
      if (checkoutUrl) {
        savePaidBookingSummary(payableBookingId, {
          originalAmount: subtotal,
          discountAmount,
          finalAmount: totalAmount,
          discountCode: selectedDiscount?.code || '',
          paymentMethod,
        });
        window.location.href = checkoutUrl;
        return;
      }
      goToSuccess(result, {}, payableBookingId);
    } catch (err) {
      const discountRejected = /discount|already used|usage limit|expired|inactive|minimum requirement/i.test(err?.message || '');
      if (selectedDiscount && discountRejected) {
        markDiscountCodeUnavailable(selectedDiscount.code, err?.message || 'Rejected by payment API');
        setDiscounts((current) => current.filter((discount) => discount.id !== selectedDiscount.id));
        setSelectedDiscountId('');
        setPromotionNotice(`Mã ${selectedDiscount.code} không còn sử dụng được và đã được ẩn.`);
      }

      if (err?.message === 'Booking is not in HOLD status') {
        try {
          const confirmedBooking = await getDetail(payableBookingId);
          if (confirmedBooking?.status === 'CONFIRMED') {
            const confirmedTickets = await getTickets(payableBookingId).catch(() => []);
            goToSuccess({}, { booking: confirmedBooking, tickets: confirmedTickets }, payableBookingId);
            return;
          }
        } catch {
          // Fall through to the normal error snackbar below.
        }
      }

      setSnackbarOpen(true);
    } finally {
      paymentInFlight.current = false;
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

  if (invalidBookingMessage) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          {invalidBookingMessage}
        </Alert>
        <Button variant="contained" color="primary" onClick={() => navigate('/my-bookings')} sx={{ mt: 3 }}>
          Quay lại vé của tôi
        </Button>
      </Container>
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
                ) : availableDiscounts.length === 0 && availableCombos.length === 0 ? (
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

                        {availableDiscounts.map((discount) => {
                          const previewDiscount = getDiscountAmount(discount, subtotal);

                          return (
                            <Card
                              key={discount.id}
                              onClick={() => setSelectedDiscountId(discount.id)}
                              sx={{
                                cursor: 'pointer',
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
                                    onChange={() => setSelectedDiscountId(discount.id)}
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
                                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                                      Tạm giảm {formatCurrency(previewDiscount)} cho đơn này
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

                      {availableCombos.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 3 }}>
                          Hiện tại chưa có combo nào đang mở bán cho tài khoản của bạn.
                        </Alert>
                      ) : (
                        <Stack spacing={1.5}>
                          {availableCombos.map((combo) => (
                            <Card
                              key={combo.id}
                              onClick={() => toggleCombo(combo.id)}
                              sx={{
                                cursor: 'pointer',
                                border: selectedComboIds.includes(combo.id)
                                  ? '2px solid #FBBF24'
                                  : '1px solid rgba(148, 163, 184, 0.1)',
                                bgcolor: selectedComboIds.includes(combo.id)
                                  ? 'rgba(251, 191, 36, 0.04)'
                                  : 'background.default',
                              }}
                            >
                              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Checkbox
                                    checked={selectedComboIds.includes(combo.id)}
                                    onChange={() => toggleCombo(combo.id)}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                      {combo.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {combo.description || 'Combo hiện có trong hệ thống.'}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={combo.price > 0 ? formatCurrency(combo.price) : 'Đang cập nhật'}
                                    color={selectedComboIds.includes(combo.id) ? 'primary' : 'default'}
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

                {selectedCombos.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Combo đã chọn:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
                        {selectedCombos.map((combo) => combo.name).join(', ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tổng tiền combo:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCurrency(comboTotal)}
                      </Typography>
                    </Box>
                  </>
                )}

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
        <Alert onClose={handleSnackbarClose} severity={isHoldExpired ? 'warning' : 'error'} variant="filled" sx={{ borderRadius: 3, fontWeight: 600 }}>
          {isHoldExpired ? 'Phiên giữ ghế đã hết hạn. Hệ thống đã trả ghế về sơ đồ.' : (apiError || 'Thanh toán không thành công. Vui lòng thử lại.')}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PaymentPage;
