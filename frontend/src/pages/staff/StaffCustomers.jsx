import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { staffCustomerService } from '../../services/staffCustomerService';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};
const formatCurrency = (n) =>
  typeof n === 'number' ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '—';

const StaffCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState(null);
  const [onlineMovies, setOnlineMovies] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [complaint, setComplaint] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockTarget, setLockTarget] = useState(null); // { customer, lock: bool }
  const [toast, setToast] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffCustomerService.list();
      // Chỉ hiển thị khách hàng (MEMBER); loại bỏ tài khoản ADMIN/STAFF nếu backend trả lẫn.
      const onlyMembers = (Array.isArray(data) ? data : []).filter(
        (c) => !c.role || String(c.role).toUpperCase() === 'MEMBER',
      );
      setCustomers(onlyMembers);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
  }, [loadCustomers]);

  const patchCustomer = (dto) => {
    setCustomers((list) => list.map((c) => (c.id === dto.id ? { ...c, ...dto } : c)));
    if (detail?.id === dto.id) setDetail((d) => ({ ...d, ...dto }));
  };

  const openDetail = async (customer) => {
    setDetail(customer);
    setTab(0);
    setBookings(null);
    setOnlineMovies(null);
    setComplaint('');
    setHistoryLoading(true);
    try {
      const [bk, om, fresh] = await Promise.all([
        staffCustomerService.getBookings(customer.id).catch(() => null),
        staffCustomerService.getOnlineMovies(customer.id).catch(() => null),
        staffCustomerService.getById(customer.id).catch(() => null),
      ]);
      setBookings(bk);
      setOnlineMovies(om);
      if (fresh) setDetail(fresh);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLockToggle = async () => {
    const { customer, lock } = lockTarget;
    setLockTarget(null);
    setBusy(true);
    try {
      const dto = lock
        ? await staffCustomerService.lock(customer.id)
        : await staffCustomerService.unlock(customer.id);
      patchCustomer(dto || { id: customer.id, enabled: !lock });
      setToast({ severity: 'success', message: lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Thao tác thất bại.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSendComplaint = async () => {
    if (!complaint.trim()) return;
    setSending(true);
    try {
      await staffCustomerService.sendComplaint(detail.id, complaint.trim());
      setToast({ severity: 'success', message: 'Đã ghi nhận khiếu nại của khách.' });
      setComplaint('');
    } catch (err) {
      setToast({ severity: 'error', message: err.message || 'Gửi khiếu nại thất bại.' });
    } finally {
      setSending(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) =>
        [c.fullName, c.email, c.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      )
    : customers;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleAltRoundedIcon color="primary" /> Quản lý khách hàng
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Xem thông tin, lịch sử mua vé & phim online, khóa/mở khóa tài khoản và hỗ trợ khiếu nại.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Danh sách khách hàng</Typography>
        <TextField
          size="small"
          placeholder="Tìm theo tên, email, SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button variant="outlined" onClick={loadCustomers}>Thử lại</Button>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>Không có khách hàng nào khớp.</Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Liên hệ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Đăng nhập</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={c.avatarUrl || undefined} sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                            {(c.fullName || c.email || '?').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={700}>{c.fullName || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{c.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={c.provider || 'LOCAL'} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.enabled ? 'Hoạt động' : 'Đã khóa'}
                          color={c.enabled ? 'success' : 'error'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Xem chi tiết">
                          <IconButton size="small" onClick={() => openDetail(c)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {c.enabled ? (
                          <Tooltip title="Khóa tài khoản">
                            <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => setLockTarget({ customer: c, lock: true })}>
                              <LockRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Mở khóa tài khoản">
                            <IconButton size="small" color="success" onClick={() => setLockTarget({ customer: c, lock: false })}>
                              <LockOpenRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog chi tiết khách hàng */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={detail.avatarUrl || undefined} sx={{ width: 44, height: 44, bgcolor: 'primary.main' }}>
                  {(detail.fullName || detail.email || '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={800}>{detail.fullName || '—'}</Typography>
                  <Chip
                    size="small"
                    label={detail.enabled ? 'Hoạt động' : 'Đã khóa'}
                    color={detail.enabled ? 'success' : 'error'}
                    sx={{ fontWeight: 700, mt: 0.3 }}
                  />
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 0 }}>
              <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }} variant="fullWidth">
                <Tab label="Thông tin" />
                <Tab label="Lịch sử vé" />
                <Tab label="Phim online" />
                <Tab label="Khiếu nại" />
              </Tabs>

              {historyLoading && <CircularProgress size={20} sx={{ mb: 1 }} />}

              {/* Tab 0: Thông tin */}
              {tab === 0 && (
                <Stack spacing={1.2}>
                  <Row label="Email" value={detail.email} />
                  <Row label="Số điện thoại" value={detail.phone} />
                  <Row label="Vai trò" value={detail.role} />
                  <Row label="Phương thức đăng nhập" value={detail.provider} />
                  <Row label="Trạng thái" value={detail.enabled ? 'Hoạt động' : 'Đã khóa'} />
                  <Row label="Mã khách hàng" value={detail.id} />
                </Stack>
              )}

              {/* Tab 1: Lịch sử mua vé */}
              {tab === 1 && (
                bookings?.bookings?.length ? (
                  <List dense disablePadding>
                    {bookings.bookings.map((b) => (
                      <ListItem key={b.bookingId} disableGutters sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`${b.movieTitle} · ${b.seats || '—'}`}
                          secondary={`${b.confirmationCode} · ${formatDateTime(b.startTime)} · ${formatCurrency(b.totalAmount)} · ${b.status}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>Khách chưa có lịch sử đặt vé.</Typography>
                )
              )}

              {/* Tab 2: Phim online */}
              {tab === 2 && (
                onlineMovies?.movies?.length ? (
                  <List dense disablePadding>
                    {onlineMovies.movies.map((m, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`${m.movieTitle} — ${m.accessGranted ? 'có quyền xem' : 'chưa có quyền'}`}
                          secondary={`Mua: ${formatDateTime(m.purchasedAt)} · ${formatCurrency(m.amount)} · Hạn: ${formatDateTime(m.expiresAt)}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>Khách chưa mua phim online.</Typography>
                )
              )}

              {/* Tab 3: Khiếu nại */}
              {tab === 3 && (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Ghi nhận nội dung khiếu nại / phản ánh của khách hàng.
                  </Typography>
                  <TextField
                    label="Nội dung khiếu nại"
                    multiline
                    minRows={4}
                    fullWidth
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SupportAgentRoundedIcon />}
                    onClick={handleSendComplaint}
                    disabled={sending || !complaint.trim()}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {sending ? 'Đang gửi…' : 'Ghi nhận khiếu nại'}
                  </Button>
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDetail(null)}>Đóng</Button>
              {detail.enabled ? (
                <Button color="error" variant="contained" startIcon={<LockRoundedIcon />} disabled={busy} onClick={() => setLockTarget({ customer: detail, lock: true })}>
                  Khóa tài khoản
                </Button>
              ) : (
                <Button color="success" variant="contained" startIcon={<LockOpenRoundedIcon />} disabled={busy} onClick={() => setLockTarget({ customer: detail, lock: false })}>
                  Mở khóa
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Xác nhận khóa/mở khóa */}
      <Dialog open={!!lockTarget} onClose={() => setLockTarget(null)} maxWidth="xs" fullWidth>
        {lockTarget && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>{lockTarget.lock ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                {lockTarget.lock
                  ? <>Khóa tài khoản <b>{lockTarget.customer.fullName}</b>? Khách sẽ không thể đăng nhập cho đến khi được mở khóa.</>
                  : <>Mở khóa tài khoản <b>{lockTarget.customer.fullName}</b>? Khách có thể đăng nhập trở lại.</>}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setLockTarget(null)}>Đóng</Button>
              <Button color={lockTarget.lock ? 'error' : 'success'} variant="contained" onClick={handleLockToggle}>
                {lockTarget.lock ? 'Khóa' : 'Mở khóa'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
};

const Row = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', wordBreak: 'break-all' }}>{value || '—'}</Typography>
  </Stack>
);

export default StaffCustomers;
