import { Box, Stack, Typography } from '@mui/material';
import SeatItem from './SeatItem';
import { bookingService } from '../services/bookingService';

export const SeatMap = ({ seats = [], selectedSeats = [], suggestedSeats = [], onToggleSelectSeat }) => {
  // Cấu trúc 2 chiều đã sort sẵn: [{ rowName, seats: [...] }]
  const seatRows = bookingService.groupSeatsByRow(seats);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '80%', mb: 6, textAlign: 'center', position: 'relative' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: 800,
            opacity: 0.6,
          }}
        >
          MÀN HÌNH CHIẾU
        </Typography>
        <Box
          sx={{
            height: '6px',
            bgcolor: 'primary.main',
            borderRadius: '50%',
            boxShadow: '0 4px 20px rgba(251, 191, 36, 0.7)',
            transform: 'perspective(100px) rotateX(-5deg)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '6px',
            left: '10%',
            right: '10%',
            height: '40px',
            background: 'radial-gradient(ellipse at top, rgba(251, 191, 36, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      <Box sx={{ overflowX: 'auto', width: '100%', pb: 3, display: 'flex', justifyContent: 'center' }}>
        <Stack spacing={1.5} sx={{ minWidth: 'max-content', px: 2 }}>
          {seatRows.map(({ rowName, seats: rowSeats }) => (
            <Stack key={rowName} direction="row" alignItems="center" justifyContent="center" spacing={{ xs: 1, sm: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  width: 20,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'text.secondary',
                  mr: 1,
                }}
              >
                {rowName}
              </Typography>

              <Stack direction="row" spacing={{ xs: 0.8, sm: 1.2 }} alignItems="center">
                {rowSeats.map((seat) => (
                  <SeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeats.some((selectedSeat) => selectedSeat.id === seat.id)}
                    isSuggested={suggestedSeats.some((suggestedSeat) => suggestedSeat.id === seat.id)}
                    onToggleSelect={onToggleSelectSeat}
                  />
                ))}
              </Stack>

              <Typography
                variant="subtitle2"
                sx={{
                  width: 20,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'text.secondary',
                  ml: 1,
                }}
              >
                {rowName}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 4 }}
        flexWrap="wrap"
        justifyContent="center"
        sx={{
          mt: 4,
          p: 2,
          bgcolor: 'action.hover',
          borderRadius: 3,
          border: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, border: '1.5px solid #94A3B8', bgcolor: 'action.hover', borderRadius: '6px 6px 3px 3px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Thường
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, border: '1.5px solid #8B5CF6', bgcolor: 'action.hover', borderRadius: '6px 6px 3px 3px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            VIP
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 26, height: 16, border: '1.5px solid #EC4899', bgcolor: 'action.hover', borderRadius: '6px 6px 3px 3px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đôi
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, background: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%)', borderRadius: '6px 6px 3px 3px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đang chọn
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, bgcolor: 'rgba(34, 211, 238, 0.20)', border: '1.5px solid #22D3EE', borderRadius: '6px 6px 3px 3px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đang xem trước
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: 'rgba(71, 85, 105, 0.2)',
              border: '1px dashed rgba(148, 163, 184, 0.2)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: 'rgba(148, 163, 184, 0.5)',
              fontWeight: 800,
            }}
          >
            X
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đã bán
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default SeatMap;
