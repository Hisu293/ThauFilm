import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CustomButton from './common/CustomButton';
import StatusChip from './common/StatusChip';

export const BookingSidebar = ({
  movie = {},
  showtime = {},
  selectedSeats = [],
  onProceed,
  proceedText = 'Tiếp tục thanh toán',
  disabled = false,
  showSummaryOnly = false,
}) => {
  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
  const totalAmount = seatsTotal;
  const theaterName = showtime.theaterName || showtime.cinemaName || 'ThauFilm Cinema';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getSeatGroupText = () => {
    if (selectedSeats.length === 0) return 'Chưa chọn ghế';
    return selectedSeats.map((seat) => seat.label || seat.id).join(', ');
  };

  const formattedDate = (() => {
    const raw = showtime.date || showtime.startTime;
    if (raw) {
      try {
        return new Date(`${String(raw).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return raw;
      }
    }
    return '—';
  })();

  return (
    <Card
      sx={{
        position: 'sticky',
        top: 96,
        bgcolor: 'background.paper',
        borderRadius: 4,
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.08)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2.5 }}>
          <Box
            component="img"
            src={movie.posterUrl || movie.poster || '/placeholder.svg'}
            alt={movie.title}
            sx={{
              width: 70,
              height: 100,
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {movie.ageRating && <StatusChip label={movie.ageRating} type="age" sx={{ mb: 1 }} />}
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3, color: 'text.primary' }}>
              {movie.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {movie.genre}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CalendarTodayRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Ngày chiếu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'capitalize' }}>
                {formattedDate}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <AccessTimeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Suất chiếu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {showtime.time} {showtime.format ? `• ${showtime.format}` : ''}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <LocationOnRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Rạp chiếu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {theaterName}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, mr: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Ghế chọn:
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {getSeatGroupText()}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', minWidth: 'fit-content' }}>
              {formatCurrency(seatsTotal)}
            </Typography>
          </Box>

          <Box sx={{ borderTop: '1px dashed rgba(148,163,184,0.2)', pt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Tổng tiền:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                {formatCurrency(totalAmount)}
              </Typography>
            </Box>
          </Box>
        </Stack>

        {!showSummaryOnly && onProceed && (
          <CustomButton
            fullWidth
            variant="primary"
            size="large"
            disabled={disabled || selectedSeats.length === 0}
            onClick={onProceed}
            sx={{ py: 1.8 }}
          >
            {proceedText}
          </CustomButton>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingSidebar;
