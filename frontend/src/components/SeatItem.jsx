import { Box, Tooltip, Zoom } from '@mui/material';

export const SeatItem = ({ seat, isSelected, onToggleSelect }) => {
  const { id, label, type, price, isSold } = seat;
  const displayName = label || id; // prefer human-readable label (A1, B2…)

  const getSeatColor = () => {
    if (isSold) return 'rgba(148, 163, 184, 0.15)';
    if (isSelected) return '#FBBF24'; // Gold when selected

    switch (type) {
      case 'VIP':
        return '#8B5CF6'; // Violet for VIP
      case 'DOUBLE':
        return '#EC4899'; // Pink for Double/Sweetbox
      case 'STANDARD':
      default:
        return 'rgba(148, 163, 184, 0.3)'; // Slate/Gray for Standard
    }
  };

  const getSeatHoverColor = () => {
    if (isSold) return 'none';
    if (isSelected) return '#F59E0B'; // Darker gold
    
    switch (type) {
      case 'VIP':
        return '#A78BFA'; // Lighter violet
      case 'DOUBLE':
        return '#F472B6'; // Lighter pink
      case 'STANDARD':
      default:
        return 'rgba(148, 163, 184, 0.5)';
    }
  };

  const getSeatStyles = () => {
    const isDouble = type === 'DOUBLE';
    const baseColor = getSeatColor();
    const hoverColor = getSeatHoverColor();

    return {
      width: isDouble ? { xs: 50, sm: 60 } : { xs: 26, sm: 32 },
      height: { xs: 26, sm: 32 },
      bgcolor: isSold ? 'rgba(71, 85, 105, 0.2)' : isSelected ? 'primary.main' : 'transparent',
      color: isSelected ? 'primary.contrastText' : 'text.primary',
      border: isSold 
        ? '1px dashed rgba(148, 163, 184, 0.2)' 
        : `1.5px solid ${baseColor}`,
      borderRadius: isDouble ? '10px' : '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: { xs: '0.65rem', sm: '0.75rem' },
      fontWeight: 700,
      cursor: isSold ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
      '&::before': (type === 'VIP' && !isSold && !isSelected) ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        bgcolor: '#8B5CF6',
      } : {},
      '&:hover': !isSold ? {
        bgcolor: hoverColor,
        borderColor: hoverColor,
        color: isSelected ? 'primary.contrastText' : '#0F172A',
        transform: 'scale(1.1)',
        boxShadow: `0 0 10px ${hoverColor}80`,
        zIndex: 2,
      } : {},
      opacity: isSold ? 0.45 : 1,
    };
  };

  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);

  const tooltipTitle = isSold
    ? `Ghế ${displayName} - Đã bán`
    : `Ghế ${displayName} (${type}) - ${formattedPrice}`;

  return (
    <Tooltip 
      title={tooltipTitle} 
      TransitionComponent={Zoom} 
      arrow
      disableInteractive
    >
      <Box 
        onClick={() => !isSold && onToggleSelect(seat)}
        sx={getSeatStyles()}
      >
        {isSold ? 'X' : displayName}
      </Box>
    </Tooltip>
  );
};

export default SeatItem;
