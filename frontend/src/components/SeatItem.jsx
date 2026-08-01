import { Box, Tooltip, Zoom } from '@mui/material';
import { SEAT_TYPE, enumLabel } from '../constants/enums';

const TYPE_COLOR = {
  VIP: '#8B5CF6',
  COUPLE: '#EC4899',
  STANDARD: '#94A3B8',
};

const TYPE_GLOW = {
  VIP: 'rgba(139, 92, 246, 0.45)',
  COUPLE: 'rgba(236, 72, 153, 0.45)',
  STANDARD: 'rgba(148, 163, 184, 0.35)',
};

export const SeatItem = ({ seat, isSelected, isSuggested = false, onToggleSelect }) => {
  const { id, label, type, price, isSold } = seat;
  const displayName = label || id;
  const isDouble = type === 'COUPLE';
  const accent = TYPE_COLOR[type] || TYPE_COLOR.STANDARD;

  const seatStyles = () => {
    if (isSold) {
      return {
        bgcolor: 'rgba(71, 85, 105, 0.18)',
        border: '1px dashed rgba(148, 163, 184, 0.25)',
        color: 'rgba(148, 163, 184, 0.5)',
        cursor: 'not-allowed',
        boxShadow: 'none',
      };
    }
    if (isSelected) {
      return {
        background: 'radial-gradient(circle at 50% 42%, #FFFFFF 0%, #FFFFFF 46%, #FCD34D 58%, #FBBF24 100%)',
        border: '1.5px solid #FBBF24',
        color: '#0F172A',
        cursor: 'pointer',
        boxShadow: '0 6px 16px rgba(251, 191, 36, 0.5)',
      };
    }
    if (isSuggested) {
      return {
        bgcolor: 'rgba(34, 211, 238, 0.20)',
        border: '1.5px solid #22D3EE',
        color: 'info.main',
        cursor: 'pointer',
        boxShadow: '0 5px 14px rgba(34, 211, 238, 0.35)',
      };
    }
    return {
      bgcolor: 'action.hover',
      border: `1.5px solid ${accent}`,
      color: 'text.primary',
      cursor: 'pointer',
      boxShadow: 'none',
    };
  };

  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);

  const tooltipTitle = isSold
    ? `Ghế ${displayName} - Đã bán`
    : `Ghế ${displayName} (${enumLabel(SEAT_TYPE, type)}) - ${formattedPrice}${isSuggested ? ' - Đang xem trước' : ''}`;

  return (
    <Tooltip title={tooltipTitle} TransitionComponent={Zoom} arrow disableInteractive>
      <Box
        onClick={() => !isSold && onToggleSelect(seat)}
        sx={{
          position: 'relative',
          width: isDouble ? { xs: 54, sm: 64 } : { xs: 30, sm: 36 },
          height: { xs: 30, sm: 36 },
          // cinema-seat silhouette: rounded top (backrest), flat bottom (base)
          borderRadius: '10px 10px 5px 5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: { xs: '0.62rem', sm: '0.72rem' },
          fontWeight: 800,
          letterSpacing: '0.02em',
          userSelect: 'none',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background-color 0.18s ease',
          ...seatStyles(),
          // armrests at the base
          '&::after': isSold
            ? {}
            : {
                content: '""',
                position: 'absolute',
                bottom: 1,
                left: 2,
                right: 2,
                height: '3px',
                borderRadius: '3px',
                bgcolor: isSelected ? 'rgba(15,23,42,0.35)' : isSuggested ? 'rgba(34,211,238,0.55)' : `${accent}55`,
              },
          '&:hover': !isSold
            ? {
                transform: 'translateY(-2px) scale(1.08)',
                boxShadow: `0 8px 18px ${isSelected ? 'rgba(251,191,36,0.5)' : isSuggested ? 'rgba(34,211,238,0.45)' : TYPE_GLOW[type] || TYPE_GLOW.STANDARD}`,
                zIndex: 2,
              }
            : {},
        }}
      >
        {isSold ? (
          'X'
        ) : isSelected ? (
          <Box
            component="img"
            src="/logo-removebg-preview.png"
            alt="ThauFilm"
            sx={{
              width: '74%',
              height: '74%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        ) : (
          displayName
        )}
      </Box>
    </Tooltip>
  );
};

export default SeatItem;
