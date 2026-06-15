import { Box, Card, CardContent, Divider, Stack, Typography, Button } from '@mui/material';
import CustomButton from './common/CustomButton';
import StatusChip from './common/StatusChip';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';

export const BookingSidebar = ({
  movie = {},
  showtime = {},
  selectedSeats = [],
  serviceFee = 10000,
  onProceed,
  proceedText = 'Tiếp tục thanh toán',
  disabled = false,
  showSummaryOnly = false
}) => {
  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const totalAmount = seatsTotal > 0 ? seatsTotal + serviceFee : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getSeatGroupText = () => {
    if (selectedSeats.length === 0) return 'Chưa chọn ghế';
    return selectedSeats.map((s) => s.id).join(', ');
  };

  const formattedDate = showtime.dateId
    ? new Date(
        new Date().setDate(new Date().getDate() + parseInt(showtime.dateId.replace('date-', ''), 10))
      ).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '';

  return (
    <Card 
      sx={{ 
        position: 'sticky', 
        top: 96, 
        bgcolor: 'background.paper',
        borderRadius: 4,
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.08)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Movie Info */}
        <Stack direction="row" spacing={2} sx={{ mb: 2.5 }}>
          <Box
            component="img"
            src={movie.posterUrl}
            alt={movie.title}
            sx={{
              width: 70,
              height: 100,
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          />
          <Box sx={{ flex: 1 }}>
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

        {/* Showtime detail */}
        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CalendarTodayRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Ngày chiếu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textTransform: 'capitalize' }}>
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
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {showtime.time} • {showtime.format}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <MeetingRoomRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Rạp & Phòng chiếu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                ThauFilm Cinema • {showtime.room}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Pricing calculations */}
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Ghế chọn:
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {getSeatGroupText()}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 'fit-content' }}>
              {formatCurrency(seatsTotal)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Phí dịch vụ:
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {selectedSeats.length > 0 ? formatCurrency(serviceFee) : formatCurrency(0)}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Tổng tiền:
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {formatCurrency(totalAmount)}
            </Typography>
          </Box>
        </Stack>

        {/* Proceed Action Button */}
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
