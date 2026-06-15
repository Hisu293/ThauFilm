import { Box, Typography, Stack } from '@mui/material';
import SeatItem from './SeatItem';

export const SeatMap = ({ seats = [], selectedSeats = [], onToggleSelectSeat }) => {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const rows = Object.keys(seatsByRow).sort();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Curved Screen Design */}
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
            opacity: 0.6
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
        {/* Ambient light glow behind screen */}
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

      {/* Seat Layout Grid */}
      <Box sx={{ overflowX: 'auto', width: '100%', pb: 3, display: 'flex', justifyContent: 'center' }}>
        <Stack spacing={1.5} sx={{ minWidth: 'max-content', px: 2 }}>
          {rows.map((row) => (
            <Stack 
              key={row} 
              direction="row" 
              alignItems="center" 
              justifyContent="center" 
              spacing={{ xs: 1, sm: 1.5 }}
            >
              {/* Row Label Left */}
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  width: 20, 
                  textAlign: 'center', 
                  fontWeight: 700, 
                  color: 'text.secondary',
                  mr: 1
                }}
              >
                {row}
              </Typography>

              {/* Seats in Row */}
              <Stack direction="row" spacing={{ xs: 0.8, sm: 1.2 }} alignItems="center">
                {seatsByRow[row]
                  .sort((a, b) => a.col - b.col)
                  .map((seat) => (
                    <SeatItem
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedSeats.some((s) => s.id === seat.id)}
                      onToggleSelect={onToggleSelectSeat}
                    />
                  ))}
              </Stack>

              {/* Row Label Right */}
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  width: 20, 
                  textAlign: 'center', 
                  fontWeight: 700, 
                  color: 'text.secondary',
                  ml: 1
                }}
              >
                {row}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Color Guide Legend */}
      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 4 }}
        flexWrap="wrap"
        justifyContent="center"
        sx={{
          mt: 4,
          p: 2,
          bgcolor: 'rgba(30, 41, 59, 0.4)',
          borderRadius: 3,
          border: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, border: '1.5px solid rgba(148, 163, 184, 0.3)', borderRadius: '4px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Thường (85k)
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, border: '1.5px solid #8B5CF6', borderRadius: '4px', bgcolor: 'transparent' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            VIP (115k)
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 24, height: 16, border: '1.5px solid #EC4899', borderRadius: '6px', bgcolor: 'transparent' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đôi (220k)
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: '4px' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Đang chọn
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
              fontWeight: 800
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
