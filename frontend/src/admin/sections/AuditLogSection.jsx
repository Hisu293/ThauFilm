import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import adminService from '../../services/adminService';

const categories = {
  AUTH: 'Xác thực',
  USER: 'Người dùng',
  MOVIE: 'Phim',
  THEATER: 'Rạp',
  ROOM: 'Phòng chiếu',
  SHOWTIME: 'Lịch chiếu',
  PRICING: 'Giá',
  VOUCHER: 'Voucher',
  BOOKING: 'Đặt vé',
  TICKET: 'Vé',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  STREAMING: 'Phim online',
  WATCH_PARTY: 'Xem chung',
  GROUP_BOOKING: 'Đặt vé nhóm',
  WORKFORCE: 'Nhân sự',
  INVENTORY: 'Kho hàng',
  MODERATION: 'Kiểm duyệt',
  REPORT: 'Báo cáo',
  LOYALTY: 'Thành viên',
  SYSTEM: 'Hệ thống',
};

const severityMeta = {
  INFO: { label: 'Thông tin', color: 'info' },
  WARNING: { label: 'Cảnh báo', color: 'warning' },
  CRITICAL: { label: 'Nghiêm trọng', color: 'error' },
};

const auditFailureLabel = (reason) => {
  const normalized = String(reason || '').trim().toLowerCase();
  if (!normalized) return 'Thao tác không thành công.';
  if (normalized.includes('bad credentials') || normalized.includes('invalid credentials')) return 'Thông tin đăng nhập không chính xác.';
  if (normalized.includes('access denied') || normalized.includes('forbidden')) return 'Người thực hiện không có quyền hoàn tất thao tác này.';
  if (normalized.includes('not found')) return 'Không tìm thấy dữ liệu cần xử lý.';
  if (normalized.includes('timeout') || normalized.includes('timed out')) return 'Hệ thống xử lý quá thời gian cho phép.';
  if (normalized.includes('connection') || normalized.includes('connect')) return 'Không thể kết nối tới dịch vụ liên quan.';
  if (normalized.includes('duplicate') || normalized.includes('already exists')) return 'Dữ liệu đã tồn tại trong hệ thống.';
  if (/[À-ỹĐđ]/u.test(reason)) return reason;
  return 'Không thể hoàn tất thao tác do lỗi hệ thống. Hãy dùng Request ID để kiểm tra nhật ký máy chủ.';
};

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const JsonBlock = ({ title, value }) => {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{title}</Typography>
      <Box component="pre" sx={{
        m: 0,
        mt: 0.5,
        p: 1.25,
        borderRadius: 1.5,
        overflow: 'auto',
        bgcolor: 'rgba(255,255,255,.04)',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
      }}>
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  );
};

const AuditRow = ({ item }) => {
  const [open, setOpen] = useState(false);
  const severity = severityMeta[item.severity] ?? severityMeta.INFO;
  return (
    <>
      <TableRow hover>
        <TableCell width={48}>
          <Button size="small" onClick={() => setOpen((value) => !value)} aria-label="Xem chi tiết nhật ký">
            {open ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
          </Button>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(item.occurredAt)}</TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={700}>{item.actionLabel ?? item.action}</Typography>
          <Typography variant="caption" color="text.secondary">{categories[item.category] ?? item.category}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{item.actorEmail || (item.actorType === 'WEBHOOK' ? 'Webhook' : 'Hệ thống')}</Typography>
          {item.actorRole && <Typography variant="caption" color="text.secondary">{item.actorRole}</Typography>}
        </TableCell>
        <TableCell>{item.description}</TableCell>
        <TableCell><Chip size="small" color={severity.color} label={severity.label} /></TableCell>
        <TableCell>
          <Chip
            size="small"
            color={item.status === 'SUCCESS' ? 'success' : 'error'}
            label={item.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, borderBottom: open ? undefined : 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Stack spacing={1.5} sx={{ p: 2, bgcolor: 'rgba(255,255,255,.015)' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Typography variant="caption">Đối tượng: {item.targetType || '—'} / {item.targetId || '—'}</Typography>
                <Typography variant="caption">Request ID: {item.requestId || '—'}</Typography>
                <Typography variant="caption">Mã liên kết: {item.correlationId || '—'}</Typography>
                <Typography variant="caption">IP: {item.ipAddress || '—'}</Typography>
              </Stack>
              {item.reason && <Alert severity="info">Lý do: {item.reason}</Alert>}
              {item.failureReason && <Alert severity="error">Lỗi: {auditFailureLabel(item.failureReason)}</Alert>}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Box flex={1}><JsonBlock title="Dữ liệu trước thay đổi" value={item.oldValues} /></Box>
                <Box flex={1}><JsonBlock title="Dữ liệu sau thay đổi" value={item.newValues} /></Box>
              </Stack>
              <JsonBlock title="Thông tin bổ sung" value={item.metadata} />
            </Stack>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const AuditLogSection = () => {
  const [items, setItems] = useState([]);
  const [actions, setActions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ category: '', action: '', status: '' });

  const params = useMemo(() => ({
    page,
    size,
    ...(filters.category && { category: filters.category }),
    ...(filters.action && { action: filters.action }),
    ...(filters.status && { status: filters.status }),
  }), [filters, page, size]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.getAuditLogs(params);
      setItems(result?.content ?? []);
      setTotal(result?.totalElements ?? 0);
    } catch (err) {
      setError(err.message || 'Không thể tải nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    adminService.getAuditActions().then(setActions).catch(() => setActions({}));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changeFilter = (field) => (event) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2, borderRadius: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Nhóm sự kiện" value={filters.category} onChange={changeFilter('category')} sx={{ minWidth: 180 }}>
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(categories).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Sự kiện" value={filters.action} onChange={changeFilter('action')} sx={{ minWidth: 240 }}>
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(actions).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Kết quả" value={filters.status} onChange={changeFilter('status')} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="SUCCESS">Thành công</MenuItem>
            <MenuItem value="FAILED">Thất bại</MenuItem>
          </TextField>
          <Button startIcon={<RefreshRoundedIcon />} onClick={load}>Làm mới</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper} sx={{ borderRadius: 2.5 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Thời gian</TableCell>
              <TableCell>Sự kiện</TableCell>
              <TableCell>Người thực hiện</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>Mức độ</TableCell>
              <TableCell>Kết quả</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}>Chưa có nhật ký phù hợp.</TableCell></TableRow>
            ) : items.map((item) => <AuditRow key={item.id} item={item} />)}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={size}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Số dòng mỗi trang"
        />
      </TableContainer>
    </Stack>
  );
};

export default AuditLogSection;
