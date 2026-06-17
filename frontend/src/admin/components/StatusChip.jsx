import { Chip } from '@mui/material';
import { t } from '../../i18n/labels';

const STATUS_KEYS = {
  // Theater/room status numeric codes
  0: 'statuses.theater.MAINTENANCE',
  1: 'statuses.theater.ACTIVE',
  // Theater/room status strings
  ACTIVE: 'statuses.theater.ACTIVE',
  INACTIVE: 'statuses.theater.INACTIVE',
  MAINTENANCE: 'statuses.theater.MAINTENANCE',
  // Showtime status strings
  SCHEDULED: 'statuses.showtime.SCHEDULED',
  OPEN: 'statuses.showtime.OPEN',
  RUNNING: 'statuses.showtime.RUNNING',
  COMPLETED: 'statuses.showtime.COMPLETED',
  CANCELLED: 'statuses.showtime.CANCELLED',
  // Seat status strings
  BROKEN: 'statuses.seatStatus.BROKEN',
  // Booking status strings
  AVAILABLE: 'statuses.seatBooking.AVAILABLE',
  HOLDING: 'statuses.seatBooking.HOLDING',
  BOOKED: 'statuses.seatBooking.BOOKED',
  SOLD: 'statuses.seatBooking.SOLD',
  // Room type strings
  STANDARD: 'statuses.roomType.STANDARD',
  VIP: 'statuses.roomType.VIP',
  IMAX: 'statuses.roomType.IMAX',
  FOUR_DX: 'statuses.roomType.FOUR_DX',
  // Seat type strings
  COUPLE: 'statuses.seatType.COUPLE',
};

const PRESETS = {
  // Theater status: 0 = Bảo trì, 1 = Hoạt động
  0: { color: 'warning' },
  1: { color: 'success' },
  ACTIVE: { color: 'success' },
  MAINTENANCE: { color: 'warning' },
  INACTIVE: { color: 'error' },
  SCHEDULED: { color: 'info' },
  OPEN: { color: 'info' },
  RUNNING: { color: 'success' },
  COMPLETED: { color: 'default' },
  CANCELLED: { color: 'error' },
  BROKEN: { color: 'error' },
  AVAILABLE: { color: 'success' },
  HOLDING: { color: 'warning' },
  BOOKED: { color: 'info' },
  SOLD: { color: 'default' },
  STANDARD: { color: 'default' },
  VIP: { color: 'warning' },
  IMAX: { color: 'info' },
  FOUR_DX: { color: 'secondary' },
  COUPLE: { color: 'secondary' },
};

const StatusChip = ({ status, label }) => {
  const translationKey = STATUS_KEYS[status];
  const displayLabel = label || (translationKey ? t('statuses', translationKey) : status);
  const cfg = PRESETS[status] || {};
  const color = cfg.color || 'default';
  const outlined = status === 'CANCELLED' || status === 'INACTIVE' || status === 'BROKEN' || status === 'SOLD';

  return (
    <Chip
      label={displayLabel}
      size="small"
      color={color}
      variant={outlined ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22 }}
    />
  );
};

export default StatusChip;
