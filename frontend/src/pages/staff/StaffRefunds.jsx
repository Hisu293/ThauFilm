import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useAuth } from '../../context/AuthContext';
import refundService from '../../services/refundService';
import { connectRealtime } from '../../services/realtimeService';

const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('vi-VN');
};

const statusMeta = {
  REQUESTED: { label: 'Cần kiểm tra', color: 'info' },
  PENDING_APPROVAL: { label: 'Chờ Admin duyệt', color: 'warning' },
  APPROVED: { label: 'Đã hoàn tiền', color: 'success' },
  REJECTED: { label: 'Đã từ chối', color: 'error' },
  REFUND_PENDING: { label: 'Đang hoàn qua cổng', color: 'warning' },
  REFUND_FAILED: { label: 'Hoàn tiền lỗi', color: 'error' },
};

const summaryCardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  background: 'linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.01))',
  boxShadow: 'none',
};

export default function StaffRefunds() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [chatItem, setChatItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const permission = await refundService.staffAccess();
      setAccess(permission);
      if (permission?.shiftLeader) setItems(await refundService.staffList());
      else setItems([]);
    } catch (err) {
      setError(err.message || 'Không thể tải yêu cầu hoàn tiền.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    const disconnect = connectRealtime({
      onEvent: (event) => {
        const notificationType = event?.data?.notificationType;
        if (event?.type === 'NOTIFICATION' && ['REFUND_REQUEST', 'REFUND_MESSAGE'].includes(notificationType)) {
          load(true);
        }
      },
    });
    const handleFocus = () => load(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  const counts = useMemo(() => ({
    requested: items.filter((item) => item.status === 'REQUESTED').length,
    awaitingAdmin: items.filter((item) => item.status === 'PENDING_APPROVAL').length,
    completed: items.filter((item) => ['APPROVED', 'REJECTED'].includes(item.status)).length,
  }), [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!keyword) return true;
      return [item.customerName, item.customerEmail, item.ticketCode, item.movieTitle, item.reason]
        .some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
    });
  }, [items, query, statusFilter]);

  const approve = async (item) => {
    setBusy(true);
    setError('');
    try {
      const updated = await refundService.staffApprove(item.id);
      setItems((list) => list.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err.message || 'Không thể duyệt yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await refundService.staffReject(rejecting.id, reason);
      setItems((list) => list.map((row) => (row.id === updated.id ? updated : row)));
      setRejecting(null);
      setReason('');
    } catch (err) {
      setError(err.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const openChat = async (item) => {
    setChatItem(item);
    setMessages([]);
    try {
      setMessages(await refundService.staffMessages(item.id));
    } catch (err) {
      setError(err.message || 'Không thể tải cuộc trao đổi.');
    }
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    if (!content || !chatItem) return;
    try {
      const message = await refundService.staffSendMessage(chatItem.id, content);
      setMessages((list) => [...list, message]);
      setMessageText('');
    } catch (err) {
      setError(err.message || 'Không thể gửi tin nhắn.');
    }
  };

  if (loading) {
    return <Box minHeight={420} display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!access?.shiftLeader) {
    return <Alert severity="warning">Chỉ staff trưởng được xem và xử lý yêu cầu hoàn tiền.</Alert>;
  }

  const summary = [
    { label: 'Tổng yêu cầu', value: items.length, icon: ReceiptLongRoundedIcon, color: 'primary.main' },
    { label: 'Cần xử lý', value: counts.requested, icon: PendingActionsRoundedIcon, color: 'warning.main' },
    { label: 'Chờ Admin', value: counts.awaitingAdmin, icon: AdminPanelSettingsRoundedIcon, color: 'info.main' },
    { label: 'Đã xử lý', value: counts.completed, icon: CheckCircleRoundedIcon, color: 'success.main' },
  ];

  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} mb={3}>
      <Box>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Avatar sx={{ bgcolor: 'rgba(229,9,20,.14)', color: 'primary.main' }}><CurrencyExchangeRoundedIcon /></Avatar>
          <Box>
            <Typography variant="h4" fontWeight={900}>Yêu cầu hoàn tiền</Typography>
            <Typography color="text.secondary">Tiếp nhận, trao đổi và xử lý yêu cầu của khách hàng.</Typography>
          </Box>
        </Stack>
      </Box>
      <Button
        variant="outlined"
        startIcon={refreshing ? <CircularProgress size={17} /> : <RefreshRoundedIcon />}
        disabled={refreshing}
        onClick={() => load(true)}
      >
        Làm mới
      </Button>
    </Stack>

    <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }} gap={2} mb={2.5}>
      {summary.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} sx={summaryCardSx}>
          <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" fontWeight={900}>{value}</Typography></Box>
              <Avatar sx={{ bgcolor: 'action.hover', color }}><Icon /></Avatar>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>

    <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2.5 }}>
      Dưới <b>{money(access.refundApprovalThreshold)}</b>: staff trưởng được duyệt trực tiếp. Từ ngưỡng này trở lên, yêu cầu tự động chuyển Admin.
    </Alert>
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
          <TextField
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm khách hàng, mã vé, phim..."
            sx={{ width: { xs: '100%', md: 380 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
          />
          <TextField select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            {Object.entries(statusMeta).map(([value, item]) => <MenuItem key={value} value={value}>{item.label}</MenuItem>)}
          </TextField>
        </Stack>
      </CardContent>
      <Divider />

      <TableContainer>
        <Table sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell>Khách hàng / mã vé</TableCell>
              <TableCell>Thông tin suất chiếu</TableCell>
              <TableCell>Số tiền</TableCell>
              <TableCell>Lý do</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => {
              const status = statusMeta[item.status] || { label: item.status, color: 'default' };
              return <TableRow key={item.id} hover sx={{ '& td': { py: 2 } }}>
                <TableCell>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: 14, fontWeight: 800 }}>
                      {(item.customerName || item.customerEmail || '?').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={800}>{item.customerName || item.customerEmail}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.ticketCode} · {item.ticketCheckedIn ? 'Đã check-in' : 'Chưa check-in'}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={700}>{item.movieTitle || '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">Suất: {dateTime(item.showtimeStart)}</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">Gửi: {dateTime(item.createdAt)}</Typography>
                </TableCell>
                <TableCell><Typography fontWeight={900}>{money(item.amount)}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>{item.reason}</Typography>
                  {item.rejectionReason && <Typography variant="caption" color="error">Từ chối: {item.rejectionReason}</Typography>}
                </TableCell>
                <TableCell><Chip size="small" label={status.label} color={status.color} sx={{ fontWeight: 700 }} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.75}>
                    <Button size="small" variant="outlined" startIcon={<ChatRoundedIcon />} onClick={() => openChat(item)}>Chat</Button>
                    {item.status === 'REQUESTED' && <>
                      <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => approve(item)}>Duyệt</Button>
                      <Button size="small" color="error" startIcon={<CancelRoundedIcon />} disabled={busy} onClick={() => setRejecting(item)}>Từ chối</Button>
                    </>}
                  </Stack>
                </TableCell>
              </TableRow>;
            })}
            {filteredItems.length === 0 && <TableRow><TableCell colSpan={6}>
              <Stack alignItems="center" spacing={1.25} py={7}>
                <Avatar sx={{ width: 54, height: 54, bgcolor: 'action.hover', color: 'text.secondary' }}><ReceiptLongRoundedIcon /></Avatar>
                <Typography fontWeight={800}>{items.length ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu hoàn tiền'}</Typography>
                <Typography variant="body2" color="text.secondary">Danh sách sẽ tự cập nhật khi khách hàng gửi yêu cầu mới.</Typography>
              </Stack>
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>

    <Dialog open={Boolean(rejecting)} onClose={() => !busy && setRejecting(null)} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={850}>Từ chối yêu cầu hoàn tiền</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>Lý do sẽ được gửi trực tiếp đến khách hàng.</Alert>
        <TextField autoFocus fullWidth multiline minRows={4} label="Lý do từ chối" value={reason} onChange={(event) => setReason(event.target.value)} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setRejecting(null)}>Hủy</Button>
        <Button color="error" variant="contained" disabled={busy || reason.trim().length < 5} onClick={reject}>Xác nhận từ chối</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={Boolean(chatItem)} onClose={() => setChatItem(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}><ChatRoundedIcon /></Avatar>
          <Box><Typography fontWeight={850}>Trao đổi hoàn tiền</Typography><Typography variant="caption" color="text.secondary">{chatItem?.customerName || chatItem?.customerEmail} · {chatItem?.ticketCode}</Typography></Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={1.2} sx={{ minHeight: 320, maxHeight: 460, overflowY: 'auto' }}>
          {messages.length === 0 && <Typography color="text.secondary" textAlign="center" py={8}>Chưa có tin nhắn trong cuộc trao đổi này.</Typography>}
          {messages.map((message) => {
            const mine = String(message.senderId) === String(user?.id);
            return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '78%', bgcolor: mine ? 'primary.main' : 'action.hover', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.2, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>{mine ? 'Bạn' : message.senderName || 'Khách hàng'}</Typography>
              <Typography variant="body2">{message.content}</Typography>
            </Box>;
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Nhắn cho khách hàng..."
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button variant="contained" disabled={!messageText.trim()} onClick={sendMessage}><SendRoundedIcon /></Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
