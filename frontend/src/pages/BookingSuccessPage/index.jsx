import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Box, Typography, Stack, Divider, Snackbar, Alert, Button } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AppleIcon from '@mui/icons-material/Apple';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import QRCode from 'qrcode';

import BookingStepper from '../../components/BookingStepper';
import SectionCard from '../../components/common/SectionCard';
import CustomButton from '../../components/common/CustomButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';

import { useBooking } from '../../hooks/useBooking';
import { useBookingNavigate } from '../../context/BookingNavigationContext';
import { savePaidBookingSummary } from '../../utils/paidBookingStorage';

const CALENDAR_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const parseCalendarDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveShowtimeStart = (showtime) => {
  const fromStartTime = parseCalendarDate(showtime?.startTime);
  if (fromStartTime) return fromStartTime;
  if (!showtime?.date || !showtime?.time) return null;
  return parseCalendarDate(`${showtime.date}T${showtime.time}:00`);
};

const toCalendarUtc = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escapeIcs = (value) => String(value || '')
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const createCalendarEvent = ({ bookingData, theaterName, isOnlineBooking }) => {
  const start = resolveShowtimeStart(bookingData?.showtime);
  if (!start) return null;

  const explicitEnd = parseCalendarDate(bookingData?.showtime?.endTime);
  const durationMinutes = Number(bookingData?.movie?.durationMinutes || bookingData?.movie?.duration) || 120;
  const end = explicitEnd && explicitEnd > start
    ? explicitEnd
    : new Date(start.getTime() + durationMinutes * 60 * 1000);
  const detailUrl = `${window.location.origin}/my-bookings/${encodeURIComponent(bookingData.bookingId)}`;
  const seatLabels = (bookingData.selectedSeats || []).map((seat) => seat.label || seat.id).filter(Boolean).join(', ');
  const location = isOnlineBooking
    ? 'ThauFilm Online'
    : [theaterName, bookingData.showtime?.room].filter(Boolean).join(' - ');
  const description = [
    `Mã đặt vé: ${bookingData.bookingCode}`,
    seatLabels ? `Ghế: ${seatLabels}` : null,
    isOnlineBooking ? 'Vé xem phim online trên ThauFilm.' : null,
    `Chi tiết vé: ${detailUrl}`,
  ].filter(Boolean).join('\n');

  return {
    title: `ThauFilm - ${bookingData.movie?.title || 'Lịch chiếu phim'}`,
    start,
    end,
    location,
    description,
    detailUrl,
  };
};

const googleCalendarUrl = (event) => `https://calendar.google.com/calendar/render?${new URLSearchParams({
  action: 'TEMPLATE',
  text: event.title,
  dates: `${toCalendarUtc(event.start)}/${toCalendarUtc(event.end)}`,
  details: event.description,
  location: event.location,
  ctz: CALENDAR_TIME_ZONE,
}).toString()}`;

const outlookCalendarUrl = (event) => `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({
  path: '/calendar/action/compose',
  rru: 'addevent',
  subject: event.title,
  startdt: event.start.toISOString(),
  enddt: event.end.toISOString(),
  body: event.description,
  location: event.location,
}).toString()}`;

const createIcsContent = (event, bookingId) => [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//ThauFilm//Movie Booking//VI',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'BEGIN:VEVENT',
  `UID:${escapeIcs(bookingId)}@thaufilm.app`,
  `DTSTAMP:${toCalendarUtc(new Date())}`,
  `DTSTART:${toCalendarUtc(event.start)}`,
  `DTEND:${toCalendarUtc(event.end)}`,
  `SUMMARY:${escapeIcs(event.title)}`,
  `DESCRIPTION:${escapeIcs(event.description)}`,
  `LOCATION:${escapeIcs(event.location)}`,
  `URL:${escapeIcs(event.detailUrl)}`,
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

export const BookingSuccessPage = () => {
  const location = useLocation();
  const navigate = useBookingNavigate();

  const { loading: apiLoading, error: apiError, clearError, getTickets } = useBooking();

  const [bookingData, setBookingData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [onlineTicketQr, setOnlineTicketQr] = useState('');
  const [calendarNotice, setCalendarNotice] = useState({ open: false, message: '', severity: 'success' });

  const isOnlineBooking = Boolean(
    bookingData && (
      bookingData.showtime?.online ||
      bookingData.showtime?.theaterName === 'Online' ||
      bookingData.showtime?.cinemaName === 'Online' ||
      bookingData.showtime?.room === 'Xem online' ||
      bookingData.showtime?.format === 'Online'
    )
  );

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

  useEffect(() => {
    let activeRequest = true;
    if (!isOnlineBooking || !bookingData?.bookingId) return () => { activeRequest = false; };

    const detailUrl = `${window.location.origin}/my-bookings/${encodeURIComponent(bookingData.bookingId)}`;
    QRCode.toDataURL(detailUrl, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (activeRequest) setOnlineTicketQr(dataUrl);
      })
      .catch(() => {
        if (activeRequest) setSnackbarOpen(true);
      });

    return () => { activeRequest = false; };
  }, [bookingData?.bookingId, isOnlineBooking]);

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
  const movieId = movie?.id || movie?.movieId || showtime?.movieId || bookingData.movieId;
  const originalAmount = Number(bookingData.originalAmount ?? totalAmount) || 0;
  const discountAmount = Number(bookingData.discountAmount) || 0;
  const theaterName = showtime?.theaterName || showtime?.cinemaName || 'ThauFilm Cinema';
  const calendarEvent = createCalendarEvent({ bookingData, theaterName, isOnlineBooking });

  const openExternalCalendar = (url, calendarName) => {
    const popup = window.open(url, '_blank');
    if (!popup) {
      setCalendarNotice({ open: true, severity: 'error', message: `Trình duyệt đã chặn cửa sổ ${calendarName}. Vui lòng cho phép popup và thử lại.` });
      return;
    }
    popup.opener = null;
  };

  const addToAppleCalendar = () => {
    if (!calendarEvent) return;
    const content = createIcsContent(calendarEvent, bookingData.bookingId);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `thaufilm-${bookingCode || bookingData.bookingId}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setCalendarNotice({ open: true, severity: 'success', message: 'Đã tải lịch chiếu. Hãy mở file .ics để thêm vào Apple Calendar.' });
  };

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

        {isOnlineBooking && (
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2.5,
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            <Box
              sx={{
                width: 176,
                height: 176,
                p: 1,
                borderRadius: 3,
                bgcolor: '#fff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
              }}
            >
              {onlineTicketQr ? (
                <Box
                  component="img"
                  src={onlineTicketQr}
                  alt={`Mã QR vé online ${bookingCode}`}
                  sx={{ width: '100%', height: '100%', display: 'block' }}
                />
              ) : (
                <QrCode2RoundedIcon sx={{ fontSize: 96, color: '#CBD5E1' }} />
              )}
            </Box>
            <Box sx={{ maxWidth: 290 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <QrCode2RoundedIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>QR vé xem online</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Quét mã để mở chi tiết vé trên thiết bị khác. Bạn cần đăng nhập đúng tài khoản đã mua vé.
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'primary.main', fontWeight: 800, letterSpacing: '0.08em' }}>
                {bookingCode}
              </Typography>
            </Box>
          </Box>
        )}

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

        </Stack>
      </SectionCard>

      <SectionCard sx={{ mt: 3, border: '1px solid rgba(96, 165, 250, 0.2)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(96,165,250,.14)', color: '#93C5FD' }}>
            <EventAvailableRoundedIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 850 }}>Đồng bộ lịch chiếu</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              Thêm lịch xem phim vào ứng dụng bạn đang dùng để không bỏ lỡ suất chiếu.
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
          <Button
            variant="outlined"
            disabled={!calendarEvent}
            startIcon={<CalendarMonthRoundedIcon />}
            onClick={() => openExternalCalendar(googleCalendarUrl(calendarEvent), 'Google Calendar')}
            sx={{ py: 1.25, borderRadius: 3, fontWeight: 800 }}
          >
            Google Calendar
          </Button>
          <Button
            variant="outlined"
            disabled={!calendarEvent}
            startIcon={<AppleIcon />}
            onClick={addToAppleCalendar}
            sx={{ py: 1.25, borderRadius: 3, fontWeight: 800 }}
          >
            Apple Calendar
          </Button>
          <Button
            variant="outlined"
            disabled={!calendarEvent}
            startIcon={<EventAvailableRoundedIcon />}
            onClick={() => openExternalCalendar(outlookCalendarUrl(calendarEvent), 'Outlook')}
            sx={{ py: 1.25, borderRadius: 3, fontWeight: 800 }}
          >
            Outlook
          </Button>
        </Box>

        {!calendarEvent && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2.5 }}>
            Vé chưa có đủ ngày giờ suất chiếu để tạo sự kiện lịch.
          </Alert>
        )}
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
        {movieId && (
          <CustomButton
            variant="primary"
            onClick={() => navigate(`/movies/${movieId}?watch=1`)}
            sx={{ px: 4 }}
          >
            Xem phim online
          </CustomButton>
        )}
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

      <Snackbar
        open={calendarNotice.open}
        autoHideDuration={4500}
        onClose={() => setCalendarNotice((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={calendarNotice.severity}
          variant="filled"
          onClose={() => setCalendarNotice((current) => ({ ...current, open: false }))}
          sx={{ borderRadius: 3, fontWeight: 600 }}
        >
          {calendarNotice.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BookingSuccessPage;
