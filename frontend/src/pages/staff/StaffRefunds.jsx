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
  TablePagination,
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
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
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
  const [page, setPage] = useState(0);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [chatItem, setChatItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selected, setSelected] = useState(null);

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
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const pagedItems = filteredItems.slice(safePage * 10, safePage * 10 + 10);

  const approve = async (item) => {
    setBusy(true);
    setError('');
    try {
      const updated = await refundService.staffApprove(item.id);
      setItems((list) => list.map((row) => (row.id === updated.id ? updated : row)));
      setSelected((current) => (current?.id === updated.id ? updated : current));
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
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="Tìm khách hàng, mã vé, phim..."
            sx={{ width: { xs: '100%', md: 380 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
          />
          <TextField select size="small" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} sx={{ minWidth: 190 }}>
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            {Object.entries(statusMeta).map(([value, item]) => <MenuItem key={value} value={value}>{item.label}</MenuItem>)}
          </TextField>
        </Stack>
      </CardContent>
      <Divider />

      <TableContainer sx={{ overflowX: 'hidden' }}>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed', '& th, & td': { px: { xs: 1, md: 1.5 } } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '27%' }}>Khách hàng / mã vé</TableCell>
              <TableCell sx={{ width: '28%' }}>Suất chiếu</TableCell>
              <TableCell sx={{ width: '17%' }}>Số tiền</TableCell>
              <TableCell sx={{ width: '28%' }}>Xác minh / lý do</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedItems.map((item) => {
              const status = statusMeta[item.status] || { label: item.status, color: 'default' };
              return <TableRow key={item.id} hover sx={{ '& td': { py: 1.5 } }}>
                <TableCell>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: 14, fontWeight: 800 }}>
                      {(item.customerName || item.customerEmail || '?').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap fontWeight={800}>{item.customerName || item.customerEmail}</Typography>
                      <Typography noWrap display="block" variant="caption" color="text.secondary">{item.ticketCode}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography noWrap fontWeight={700}>{item.movieTitle || '—'}</Typography>
                  <Typography noWrap display="block" variant="caption" color="text.secondary">{dateTime(item.showtimeStart)}</Typography>
                </TableCell>
                <TableCell><Typography fontWeight={900}>{money(item.amount)}</Typography></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Chip size="small" label={status.label} color={status.color} sx={{ maxWidth: '100%', fontWeight: 700 }} />
                      <Typography noWrap display="block" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{item.reason || 'Không có lý do'}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelected(item)} sx={{ flexShrink: 0 }}>Xem</Button>
                  </Stack>
                </TableCell>
              </TableRow>;
            })}
            {filteredItems.length === 0 && <TableRow><TableCell colSpan={4}>
              <Stack alignItems="center" spacing={1.25} py={7}>
                <Avatar sx={{ width: 54, height: 54, bgcolor: 'action.hover', color: 'text.secondary' }}><ReceiptLongRoundedIcon /></Avatar>
                <Typography fontWeight={800}>{items.length ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu hoàn tiền'}</Typography>
                <Typography variant="body2" color="text.secondary">Danh sách sẽ tự cập nhật khi khách hàng gửi yêu cầu mới.</Typography>
              </Stack>
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredItems.length}
        page={safePage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={10}
        rowsPerPageOptions={[10]}
        labelRowsPerPage="Số dòng mỗi trang"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Card>

    <Dialog open={Boolean(selected)} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="md">
      <DialogTitle fontWeight={900}>Chi tiết yêu cầu hoàn tiền</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
            <Box><Typography variant="caption" color="text.secondary">Khách hàng / mã vé</Typography><Typography fontWeight={900}>{selected?.customerName || selected?.customerEmail || '—'} · {selected?.ticketCode || '—'}</Typography><Typography variant="body2">{selected?.customerEmail || '—'}</Typography></Box>
            <Chip label={(statusMeta[selected?.status] || {}).label || selected?.status || '—'} color={(statusMeta[selected?.status] || {}).color || 'default'} />
          </Stack>
          <Divider />
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={2}>
            <Box><Typography variant="caption" color="text.secondary">Phim / suất chiếu</Typography><Typography fontWeight={800}>{selected?.movieTitle || '—'}</Typography><Typography variant="body2">{dateTime(selected?.showtimeStart)} – {dateTime(selected?.showtimeEnd)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Số tiền hoàn</Typography><Typography variant="h6" fontWeight={950} color="warning.main">{money(selected?.amount)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Trạng thái suất chiếu</Typography><Typography fontWeight={700}>{selected?.showtimeEnded ? 'Suất đã kết thúc' : selected?.showtimeStarted ? 'Suất đang chiếu' : 'Chưa đến giờ chiếu'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Xác minh sử dụng</Typography><Typography fontWeight={700} color={selected?.contentAccessed ? 'error.main' : 'success.main'}>{selected?.contentAccessed ? 'Đã mở phim lúc ' + dateTime(selected?.firstViewedAt) : 'Chưa ghi nhận mở phim'}</Typography><Typography variant="caption">{selected?.ticketCheckedIn ? 'Vé đã check-in' : 'Vé chưa check-in'}</Typography></Box>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}><Typography variant="caption" color="text.secondary">Lý do khách gửi</Typography><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected?.reason || 'Không có lý do'}</Typography>{selected?.rejectionReason && <Typography color="error.main" sx={{ mt: 1 }}>Phản hồi xử lý: {selected.rejectionReason}</Typography>}</Box>
          <Box><Typography variant="caption" color="text.secondary">Phương thức hoàn tiền</Typography><Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{selected?.refundMethod === 'AUTOMATIC' ? 'PayOS/Bảo Kim · BIN ' + (selected?.bankBin || '—') + ' · STK ' + (selected?.bankAccountNumber || '—') : 'Hoàn tiền thủ công bằng QR'}</Typography></Box>
          {selected?.refundQrImageUrl && <Button variant="outlined" startIcon={<QrCode2RoundedIcon />} href={selected.refundQrImageUrl} target="_blank" rel="noreferrer">Mở QR nhận tiền</Button>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={() => setSelected(null)}>Đóng</Button>
        <Button variant="outlined" startIcon={<ChatRoundedIcon />} onClick={() => { openChat(selected); setSelected(null); }}>Chat với khách</Button>
        {selected?.status === 'REQUESTED' && <Button color="error" startIcon={<CancelRoundedIcon />} disabled={busy} onClick={() => { setRejecting(selected); setSelected(null); }}>Từ chối</Button>}
        {selected?.status === 'REQUESTED' && <Button variant="contained" color="success" disabled={busy || (selected?.refundMethod !== 'AUTOMATIC' && Number(selected?.amount || 0) >= Number(access?.refundApprovalThreshold || 200000) && !selected?.refundQrImageUrl)} onClick={() => approve(selected)}>Duyệt yêu cầu</Button>}
      </DialogActions>
    </Dialog>

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
        {chatItem?.requiresAdmin && !chatItem?.refundQrImageUrl && <Alert severity="warning" sx={{ mb: 1.5 }}>
          Đơn từ 200.000đ cần khách gửi ảnh QR nhận tiền trong chat trước khi staff chuyển lên Admin.
        </Alert>}
        <Stack spacing={1.2} sx={{ minHeight: 320, maxHeight: 460, overflowY: 'auto' }}>
          {messages.length === 0 && <Typography color="text.secondary" textAlign="center" py={8}>Chưa có tin nhắn trong cuộc trao đổi này.</Typography>}
          {messages.map((message) => {
            const mine = String(message.senderId) === String(user?.id);
            return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '78%', bgcolor: mine ? 'primary.main' : 'action.hover', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.2, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>{mine ? 'Bạn' : message.senderName || 'Khách hàng'}</Typography>
              <Typography variant="body2">{message.content}</Typography>
              {message.imageUrl && <Box component="a" href={message.imageUrl} target="_blank" rel="noreferrer" display="block" mt={1}>
                <Box component="img" src={message.imageUrl} alt="QR nhận tiền của khách" sx={{ display: 'block', width: '100%', maxWidth: 280, maxHeight: 280, objectFit: 'contain', borderRadius: 1.5, bgcolor: 'common.white' }} />
              </Box>}
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
