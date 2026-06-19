import { Chip } from '@mui/material';
import {
  FACILITY_STATUS,
  SEAT_BOOKING_STATUS,
  SHOWTIME_STATUS,
} from '../../constants/enums';

// Gộp tất cả enum chuẩn của backend thành map { value: { label, color } }
const fromEnumMaps = (...maps) =>
  maps.reduce((acc, map) => {
    Object.values(map).forEach(({ value, label, color }) => {
      acc[value] = { label, color };
    });
    return acc;
  }, {});

const PRESETS = {
  // Enum chuẩn backend: trạng thái rạp/phòng/ghế, đặt ghế, suất chiếu
  ...fromEnumMaps(FACILITY_STATUS, SEAT_BOOKING_STATUS, SHOWTIME_STATUS),

  // Tương thích dữ liệu/khóa cũ
  0: { label: 'Bảo trì', color: 'warning' },
  1: { label: 'Hoạt động', color: 'success' },
  active: { label: 'Hoạt động', color: 'success' },
  maintenance: { label: 'Bảo trì', color: 'warning' },
  upcoming: { label: 'Sắp chiếu', color: 'info' },
  NOW_SHOWING: { label: 'Đang chiếu', color: 'success' },
  COMING_SOON: { label: 'Sắp chiếu', color: 'info' },
  STOPPED: { label: 'Ngừng chiếu', color: 'default' },
  hidden: { label: 'Đã ẩn', color: 'error' },
  enabled: { label: 'Hoạt động', color: 'success' },
  disabled: { label: 'Đã khóa', color: 'error' },
  ADMIN: { label: 'Admin', color: 'error' },
  STAFF: { label: 'Staff', color: 'info' },
  MEMBER: { label: 'Member', color: 'default' },
  locked: { label: 'Đã khóa', color: 'error' },
  ready: { label: 'Sẵn sàng', color: 'success' },
  missing: { label: 'Chưa upload', color: 'warning' },
  confirmed: { label: 'Đã xác nhận', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'default' },
  Customer: { label: 'Customer', color: 'default' },
  Staff: { label: 'Staff', color: 'info' },
  Admin: { label: 'Admin', color: 'error' },
};

const StatusChip = ({ status, label }) => {
  const cfg = PRESETS[status] || { label: label || status, color: 'default' };
  const displayLabel = label || cfg.label || status;
  // Filled success/warning chips have low text contrast on their bright fills;
  // force a dark, fully-opaque label so the text stays readable.
  const needsDarkText = cfg.color === 'success' || cfg.color === 'warning';
  return (
    <Chip
      label={displayLabel}
      size="small"
      color={cfg.color}
      variant={status === 'cancelled' || status === 'Customer' ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 700,
        fontSize: '0.68rem',
        height: 22,
        ...(needsDarkText && { color: '#0B1120' }),
      }}
    />
  );
};

export default StatusChip;
