import { Chip } from '@mui/material';

export const StatusChip = ({ label = '', type = 'age', sx = {} }) => {
  const getAgeRatingStyles = (rating) => {
    switch (rating.toUpperCase()) {
      case 'P':
        return {
          bgcolor: 'rgba(34, 197, 94, 0.15)',
          color: '#4ADE80',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          label: 'P - Mọi lứa tuổi',
        };
      case 'T13':
        return {
          bgcolor: 'rgba(249, 115, 22, 0.15)',
          color: '#FB923C',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          label: 'T13 - Khán giả dưới 13 tuổi phải có cha mẹ đi cùng',
        };
      case 'T16':
        return {
          bgcolor: 'rgba(239, 68, 68, 0.15)',
          color: '#F87171',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          label: 'T16 - Cấm khán giả dưới 16 tuổi',
        };
      case 'T18':
        return {
          bgcolor: 'rgba(220, 38, 38, 0.2)',
          color: '#FCA5A5',
          borderColor: 'rgba(220, 38, 38, 0.4)',
          fontWeight: 800,
          label: 'T18 - Cấm khán giả dưới 18 tuổi',
        };
      default:
        return {
          bgcolor: 'rgba(148, 163, 184, 0.15)',
          color: '#F8FAFC',
          borderColor: 'rgba(148, 163, 184, 0.3)',
          label: rating,
        };
    }
  };

  const getFormatStyles = (fmt) => {
    switch (fmt.toUpperCase()) {
      case 'IMAX 2D':
      case 'IMAX 3D':
      case 'IMAX':
        return {
          bgcolor: 'rgba(251, 191, 36, 0.15)',
          color: '#FBBF24',
          borderColor: 'rgba(251, 191, 36, 0.4)',
          fontWeight: 800,
        };
      case '3D':
        return {
          bgcolor: 'rgba(6, 182, 212, 0.15)',
          color: '#22D3EE',
          borderColor: 'rgba(6, 182, 212, 0.3)',
        };
      case '2D':
      default:
        return {
          bgcolor: 'rgba(148, 163, 184, 0.12)',
          color: '#94A3B8',
          borderColor: 'rgba(148, 163, 184, 0.2)',
        };
    }
  };

  const config = type === 'age' ? getAgeRatingStyles(label) : getFormatStyles(label);

  return (
    <Chip
      label={type === 'age' ? config.label : label}
      variant="outlined"
      size="small"
      sx={{
        fontWeight: config.fontWeight || 600,
        fontSize: '0.75rem',
        borderRadius: '6px',
        bgcolor: config.bgcolor,
        color: config.color,
        borderColor: config.borderColor,
        height: '24px',
        ...sx,
      }}
    />
  );
};

export default StatusChip;
