import { Chip, alpha, useTheme } from '@mui/material';

const StatusChip = ({ status, label }) => {
  const theme = useTheme();
  
  // Define color mappings for different statuses
  const getStatusConfig = () => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'valid':
      case 'success':
      case 'active':
      case 'hoạt động':
      case 1:
        return { color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.1) };
      case 'checked in':
      case 'used':
      case 'completed':
        return { color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.1) };
      case 'expired':
      case 'warning':
      case 'maintenance':
      case 'bảo trì':
      case 0:
        return { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1) };
      case 'invalid':
      case 'cancelled':
      case 'error':
      case 'rejected':
        return { color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.1) };
      default:
        return { color: theme.palette.text.secondary, bg: alpha(theme.palette.text.secondary, 0.1) };
    }
  };

  const config = getStatusConfig();
  const displayLabel = label || status;

  return (
    <Chip
      label={displayLabel}
      size="small"
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 'bold',
        px: 1,
        border: 'none',
        borderRadius: 1.5,
      }}
    />
  );
};

export default StatusChip;
