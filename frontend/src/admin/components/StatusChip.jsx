import { Chip } from '@mui/material';

const PRESETS = {
  // Theater status: 0 = Bảo trì, 1 = Hoạt động
  0: { label: 'Bảo trì', color: 'warning' },
  1: { label: 'Hoạt động', color: 'success' },
  ACTIVE: { label: 'Hoạt động', color: 'success' },
  MAINTENANCE: { label: 'Bảo trì', color: 'warning' },
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
  maintenance: { label: 'Bảo trì', color: 'warning' },
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
  return (
    <Chip
      label={label || cfg.label}
      size="small"
      color={cfg.color}
      variant={status === 'cancelled' || status === 'Customer' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22 }}
    />
  );
};

export default StatusChip;
