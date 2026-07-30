import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import QRCode from 'qrcode';

import BookingStepper from '../../components/BookingStepper';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import PaymentMethodCard from '../../components/PaymentMethodCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import CustomButton from '../../components/common/CustomButton';
import EmptyState from '../../components/common/EmptyState';
import { useBooking } from '../../hooks/useBooking';
import { useBookingFlow } from '../../context/BookingContext';
import { useBookingNavigate } from '../../context/BookingNavigationContext';
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
  saveBookingReplacement,
  savePaidBookingSummary,
} from '../../utils/paidBookingStorage';

const BOOKING_COMBOS_KEY = 'tf_booking_combos';

const readBookingComboIds = (bookingId) => {
  if (!bookingId) return [];
  try {
    const store = JSON.parse(sessionStorage.getItem(BOOKING_COMBOS_KEY) || '{}');
    return Array.isArray(store[String(bookingId)]) ? store[String(bookingId)] : [];
  } catch {
    return [];
  }
};

const saveBookingComboIds = (bookingId, comboIds) => {
  if (!bookingId) return;
  try {
    const store = JSON.parse(sessionStorage.getItem(BOOKING_COMBOS_KEY) || '{}');
    store[String(bookingId)] = comboIds;
    sessionStorage.setItem(BOOKING_COMBOS_KEY, JSON.stringify(store));
  } catch {
    // Storage failure must not block payment.
  }
};

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

const getDiscountUnavailableReason = (discount, subtotal, selectedSeats = []) => {
  if (!discount || discount.active === false) return 'Mã đang tạm ngưng';
  if (!['FIXED', 'PERCENTAGE'].includes(discount.type) || discount.value <= 0) return 'Mã không hợp lệ';
  if (discount.usageLimit > 0 && discount.usageCount >= discount.usageLimit) return 'Mã đã hết lượt sử dụng';
  if (subtotal < (discount.minPurchaseAmount || 0)) {
    return `Cần đơn tối thiểu ${formatCurrency(discount.minPurchaseAmount)}`;
  }
  if (!seatMatchesDiscount(discount, selectedSeats)) {
    return `Chỉ áp dụng cho ghế ${discount.applicableSeatTypes}`;
  }
  return '';
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
  const navigate = useBookingNavigate();
  const { loading: apiLoading, error: apiError, clearError, getDetail, getTickets, create, pay, syncPayment, cancel } = useBooking();
  const { updateBookingState, clearBookingState } = useBookingFlow();

  const [bookingId, setBookingId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookingMode, setBookingMode] = useState('THEATER');
  const [paymentMethod, setPaymentMethod] = useState('qr_pay');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [originalComboIds, setOriginalComboIds] = useState([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [promotionNotice, setPromotionNotice] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingOriginalAmount, setBookingOriginalAmount] = useState(null);
  const [invalidBookingMessage, setInvalidBookingMessage] = useState('');
  const [payosCheckout, setPayosCheckout] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const paymentInFlight = useRef(false);
  const { isExpired } = useHoldCountdown(holdExpiresAt);
  const isHoldExpired = Boolean(holdExpiresAt) && isExpired;
  const isOnlineMovieBooking = bookingMode === 'ONLINE_MOVIE';

  useEffect(() => {
    let active = true;
    if (!payosCheckout?.qrCode) {
      return undefined;
    }
    QRCode.toDataURL(payosCheckout.qrCode, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    }).then((dataUrl) => {
      if (active) setQrImage(dataUrl);
    }).catch(() => {
      if (active) setQrImage('');
    });
    return () => { active = false; };
  }, [payosCheckout]);

  useEffect(() => {
    let currentBookingId = location.state?.bookingId;
    if (!currentBookingId) {
      currentBookingId = sessionStorage.getItem('tf_booking_id');
    }

    const pendingContext = currentBookingId ? getPendingBooking(currentBookingId) : null;
    Promise.resolve().then(() => {
      if (currentBookingId) {
        setBookingId(currentBookingId);
        const savedComboIds = readBookingComboIds(currentBookingId);
        setSelectedComboIds(savedComboIds);
        setOriginalComboIds(savedComboIds);
      }
      setMovie(mergeMovieContext(location.state?.movie, pendingContext?.movie));
      setShowtime(mergeShowtimeContext(location.state?.showtime, pendingContext?.showtime));
      setSelectedSeats(location.state?.selectedSeats || pendingContext?.selectedSeats || []);
      setBookingMode(location.state?.bookingMode || pendingContext?.bookingMode || 'THEATER');
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
        if ((booking.seats || []).length === 0 && Number(booking.totalAmount || booking.originalAmount) > 0) {
          setBookingMode('ONLINE_MOVIE');
        }

        savePendingBooking({
          id: booking.id,
          movie: mergedMovie,
          showtime: mergedShowtime,
          selectedSeats: booking.seats || [],
          bookingMode: (booking.seats || []).length === 0 ? 'ONLINE_MOVIE' : bookingMode,
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
      if (bookingMode === 'ONLINE_MOVIE') {
        setDiscounts([]);
        setCombos([]);
        setSelectedDiscountId('');
        setSelectedComboIds([]);
        setOriginalComboIds([]);
        setLoadingPromotions(false);
        setPromotionNotice('Vé xem phim online không áp dụng mã giảm giá hoặc combo bắp nước.');
        return;
      }

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

        if (discountRes.status === 'rejected' && comboRes.status === 'rejected') {
          setPromotionNotice('Không thể tải mã giảm giá và combo. Vui lòng thử tải lại trang.');
        } else if (discountRes.status === 'rejected') {
          setPromotionNotice('Combo đã được tải, nhưng chưa thể tải danh sách mã giảm giá.');
        } else if (comboRes.status === 'rejected') {
          setPromotionNotice('Mã giảm giá đã được tải, nhưng chưa thể tải danh sách combo.');
        } else {
          setPromotionNotice('Mã giảm giá và combo đã được đồng bộ từ hệ thống.');
        }
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
  }, [bookingMode]);

  useEffect(() => {
    if (apiError) {
      Promise.resolve().then(() => setSnackbarOpen(true));
    }
  }, [apiError]);
  const selectedSeatsTotal = selectedSeats.reduce(
    (sum, seat) => sum + (Number(seat.price) || 0),
    0,
  );
  const availableCombos = useMemo(
    () => combos.filter((combo) => combo.active !== false && combo.id && combo.price > 0),
    [combos],
  );
  const selectedCombos = useMemo(
    () => availableCombos.filter((combo) => selectedComboIds.includes(combo.id)),
    [availableCombos, selectedComboIds],
  );
  const comboTotal = selectedCombos.reduce((sum, combo) => sum + (Number(combo.price) || 0), 0);
  const originalComboTotal = availableCombos
    .filter((combo) => originalComboIds.includes(combo.id))
    .reduce((sum, combo) => sum + (Number(combo.price) || 0), 0);
  const seatsTotal = isOnlineMovieBooking
    ? Number(bookingOriginalAmount ?? 0)
    : bookingOriginalAmount !== null
    ? Math.max(Number(bookingOriginalAmount) - originalComboTotal, 0)
    : selectedSeatsTotal;
  const subtotal = isOnlineMovieBooking ? seatsTotal : seatsTotal + comboTotal;
  const availableDiscounts = discounts.filter(
    (discount) => !getDiscountUnavailableReason(discount, subtotal, selectedSeats),
  );
  const sortedDiscounts = [...discounts].sort((first, second) => {
    const firstUnavailable = Boolean(getDiscountUnavailableReason(first, subtotal, selectedSeats));
    const secondUnavailable = Boolean(getDiscountUnavailableReason(second, subtotal, selectedSeats));
    return Number(firstUnavailable) - Number(secondUnavailable);
  });
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

    if (isOnlineMovieBooking) {
      navigate('/booking/success', {
        state: {
          bookingId: paidBookingId,
          movieId: confirmedBooking?.movieId || movie?.id || movie?.movieId || showtime?.movieId,
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
    } else {
      navigate('/profile?tab=history', { replace: true });
    }

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
      const discountCode = isOnlineMovieBooking ? '' : (selectedDiscount?.code || '');
      const comboSelectionChanged =
        !isOnlineMovieBooking && [...selectedComboIds].sort().join(',') !== [...originalComboIds].sort().join(',');
      updateBookingState({ bookingId, paymentStatus: 'PAYING' });

      if (comboSelectionChanged) {
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
        saveBookingComboIds(payableBookingId, selectedComboIds);
        setOriginalComboIds(selectedComboIds);
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
        if (selectedComboIds.length > 0) {
          saveBookingComboIds(payableBookingId, selectedComboIds);
        }
        savePaidBookingSummary(payableBookingId, {
          originalAmount: subtotal,
          discountAmount,
          finalAmount: totalAmount,
          discountCode: selectedDiscount?.code || '',
          paymentMethod,
        });
        setQrImage('');
        setPayosCheckout({
          bookingId: payableBookingId,
          checkoutUrl,
          qrCode: result?.qrCode || result?.payment?.qrCode || '',
          amount: Number(result?.finalAmount ?? result?.payment?.amount ?? totalAmount),
          transactionId: result?.payment?.transactionId || '',
        });
        return;
      }
      goToSuccess(result, {}, payableBookingId);
    } catch (err) {
      const discountRejected = /discount|already used|usage limit|expired|inactive|minimum requirement/i.test(err?.message || '');
      if (selectedDiscount && discountRejected) {
        setSelectedDiscountId('');
        setPromotionNotice(`Mã ${selectedDiscount.code} không thể áp dụng: ${err?.message || 'backend từ chối mã'}. Danh sách đang được đồng bộ lại.`);
        bookingApi.fetchActiveDiscounts()
          .then((response) => setDiscounts(bookingService.normalizeDiscounts(response?.data ?? response ?? [])))
          .catch(() => {});
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

  const handleVerifyPayment = async () => {
    if (!payosCheckout?.bookingId || checkingPayment) return;
    setCheckingPayment(true);
    setCheckoutNotice('');
    try {
      await syncPayment(payosCheckout.bookingId);
      const confirmedBooking = await getDetail(payosCheckout.bookingId);
      if (String(confirmedBooking?.status || '').toUpperCase() !== 'CONFIRMED') {
        setCheckoutNotice('Chưa nhận được xác nhận thanh toán từ PayOS. Vui lòng kiểm tra lại sau vài giây.');
        return;
      }
      const confirmedTickets = await getTickets(payosCheckout.bookingId).catch(() => []);
      goToSuccess({}, { booking: confirmedBooking, tickets: confirmedTickets }, payosCheckout.bookingId);
    } catch (err) {
      setCheckoutNotice(err.message || 'Không thể kiểm tra trạng thái thanh toán.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (apiLoading && bookingId && (!movie || !showtime || (!isOnlineMovieBooking && selectedSeats.length === 0))) {
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

  if (!bookingId || !movie || !showtime || (!isOnlineMovieBooking && selectedSeats.length === 0)) {
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

  if (payosCheckout) {
    return (
      <Container maxWidth="md" sx={{ py: 4, minHeight: '82vh', position: 'relative' }}>
        <LoadingOverlay open={checkingPayment} message="Đang kiểm tra thanh toán..." blur fullScreen />
        <BookingStepper activeStep={3} />

        <Card sx={{ mt: 3, borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(251,191,36,0.22)' }}>
          <Box sx={{ px: { xs: 3, md: 5 }, py: 3, bgcolor: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.16)' }}>
            <Typography variant="h4" fontWeight={900}>Quét mã để thanh toán</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Mở ứng dụng ngân hàng và quét mã VietQR bên dưới.
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={5} alignItems="center">
              <Box sx={{ width: { xs: 260, sm: 320 }, minHeight: { xs: 260, sm: 320 }, p: 2, bgcolor: '#fff', borderRadius: 4, display: 'grid', placeItems: 'center', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}>
                {qrImage ? (
                  <Box component="img" src={qrImage} alt="Mã VietQR thanh toán" sx={{ width: '100%', display: 'block' }} />
                ) : (
                  <Typography color="#475569">Đang tạo mã QR...</Typography>
                )}
              </Box>

              <Stack spacing={2.25} sx={{ flex: 1, width: '100%' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phim</Typography>
                  <Typography variant="h6" fontWeight={800}>{movie.title}</Typography>
                </Box>
                <Divider />
                {(payosCheckout.confirmationCode || payosCheckout.bookingCode) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Mã đặt vé</Typography>
                    <Typography fontWeight={800}>{payosCheckout.confirmationCode || payosCheckout.bookingCode}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Số tiền cần thanh toán</Typography>
                  <Typography variant="h4" fontWeight={900} color="primary.main">
                    {formatCurrency(payosCheckout.amount)}
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Giữ nguyên số tiền và nội dung chuyển khoản được điền trong mã QR.
                </Alert>
                {checkoutNotice && <Alert severity="warning" sx={{ borderRadius: 3 }}>{checkoutNotice}</Alert>}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <CustomButton
                    variant="primary"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={handleVerifyPayment}
                    disabled={checkingPayment}
                  >
                    Tôi đã thanh toán
                  </CustomButton>
                  <Button variant="outlined" onClick={() => setPayosCheckout(null)}>
                    Quay lại chỉnh đơn
                  </Button>
                  <Button
                    variant="text"
                    endIcon={<OpenInNewRoundedIcon />}
                    onClick={() => window.open(payosCheckout.checkoutUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Mở PayOS
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
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
        title={isOnlineMovieBooking ? 'Thanh toán phim online' : 'Thanh Toán Đơn Hàng'}
        subtitle={isOnlineMovieBooking ? 'Hoàn tất thanh toán để mở quyền xem phim online trong đúng khung giờ chiếu.' : 'Chọn phương thức thanh toán và ưu đãi hiện có trước khi hoàn tất giao dịch.'}
        onBack={() =>
          isOnlineMovieBooking
            ? navigate(`/movies/${movie?.id || movie?.movieId || ''}`)
            : navigate('/booking/summary', {
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

            {!isOnlineMovieBooking && (
            <SectionCard title="Chọn Khuyến Mãi">
              <Stack spacing={2}>
                <Alert
                  severity="info"
                  sx={{ borderRadius: 2.5, py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}
                >
                  {promotionNotice || 'Danh sách ưu đãi đang đồng bộ từ API thành viên.'}
                </Alert>

                {loadingPromotions ? (
                  <LoadingOverlay open={true} message="Đang tải ưu đãi..." />
                ) : discounts.length === 0 && availableCombos.length === 0 ? (
                  <EmptyState
                    title="Chưa có ưu đãi khả dụng"
                    description="Tài khoản của bạn hiện chưa có khuyến mãi hoặc combo nào đang hoạt động."
                  />
                ) : (
                  <Stack spacing={2.5}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                        <LocalOfferRoundedIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Mã giảm giá hiện có
                        </Typography>
                      </Stack>

                      <Stack
                        spacing={1}
                        sx={{
                          maxHeight: 360,
                          overflowY: 'auto',
                          pr: 0.75,
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(251,191,36,.55) rgba(15,23,42,.35)',
                          '&::-webkit-scrollbar': { width: 6 },
                          '&::-webkit-scrollbar-thumb': {
                            bgcolor: 'rgba(251,191,36,.55)',
                            borderRadius: 99,
                          },
                        }}
                      >
                        <Card
                          onClick={() => setSelectedDiscountId('')}
                          sx={{
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: selectedDiscountId === '' ? '2px solid #FBBF24' : '1px solid rgba(148, 163, 184, 0.1)',
                            bgcolor: selectedDiscountId === '' ? 'rgba(251, 191, 36, 0.04)' : 'background.default',
                          }}
                        >
                          <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Radio
                                size="small"
                                checked={selectedDiscountId === ''}
                                onChange={() => setSelectedDiscountId('')}
                              />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Không dùng mã giảm giá
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Thanh toán theo giá hiện tại
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>

                        {sortedDiscounts.map((discount) => {
                          const previewDiscount = getDiscountAmount(discount, subtotal);
                          const unavailableReason = getDiscountUnavailableReason(discount, subtotal, selectedSeats);

                          return (
                            <Card
                              key={discount.id}
                              onClick={() => {
                                if (!unavailableReason) setSelectedDiscountId(discount.id);
                              }}
                              sx={{
                                flexShrink: 0,
                                cursor: unavailableReason ? 'not-allowed' : 'pointer',
                                opacity: unavailableReason ? 0.55 : 1,
                                border:
                                  selectedDiscount?.id === discount.id
                                    ? '2px solid #FBBF24'
                                    : '1px solid rgba(148, 163, 184, 0.1)',
                                bgcolor:
                                  selectedDiscount?.id === discount.id ? 'rgba(251, 191, 36, 0.04)' : 'background.default',
                              }}
                            >
                              <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
                                <Stack direction="row" spacing={1.25} alignItems="center">
                                  <Radio
                                    size="small"
                                    checked={selectedDiscount?.id === discount.id}
                                    onChange={() => setSelectedDiscountId(discount.id)}
                                    disabled={Boolean(unavailableReason)}
                                  />
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                      <Typography
                                        variant="subtitle2"
                                        noWrap
                                        title={discount.name}
                                        sx={{ minWidth: 0, fontWeight: 800 }}
                                      >
                                        {discount.name}
                                      </Typography>
                                      <Chip
                                        label={formatDiscountLabel(discount)}
                                        color="primary"
                                        size="small"
                                        sx={{ flexShrink: 0, height: 25, fontWeight: 800 }}
                                      />
                                    </Stack>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', mt: 0.25 }}
                                    >
                                      {discount.code} · Đơn từ {formatCurrency(discount.minPurchaseAmount)}
                                      {discount.maxDiscountAmount > 0 ? ` • Giảm tối đa ${formatCurrency(discount.maxDiscountAmount)}` : ''}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color={unavailableReason ? 'text.secondary' : 'primary.main'}
                                      sx={{ display: 'block', mt: 0.25, fontWeight: 700 }}
                                    >
                                      {unavailableReason || `Giảm ${formatCurrency(previewDiscount)} cho đơn này`}
                                    </Typography>
                                  </Box>
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

                      {originalComboIds.length > 0 && (
                        <Alert severity="info" sx={{ mb: 1.5, borderRadius: 3 }}>
                          Bạn có thể bỏ combo cũ hoặc chọn combo khác. Thay đổi sẽ được cập nhật khi tiếp tục thanh toán.
                        </Alert>
                      )}

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
            )}

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

                {isOnlineMovieBooking ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Hình thức:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', textAlign: 'right' }}>
                      Xem phim online
                    </Typography>
                  </Box>
                ) : (
                  <>
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
                  </>
                )}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isOnlineMovieBooking ? 'Vé online:' : 'Tổng giá vé:'}
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
                  {isOnlineMovieBooking
                    ? 'Vé online không giữ ghế và không áp dụng combo/mã giảm giá. Quyền xem được mở trong đúng khung giờ suất chiếu sau khi thanh toán.'
                    : 'Combo được ghi vào booking qua API tạo đơn; mã giảm giá được backend kiểm tra lại khi xác nhận thanh toán. Số tiền cuối cùng lấy theo kết quả API thanh toán.'}
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
