import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useAuth } from '../../context/AuthContext';
import refundService from '../../services/refundService';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const meta = {
  REQUESTED: ['Khách đang yêu cầu', 'info'],
  PENDING_APPROVAL: ['Chờ Admin duyệt', 'warning'],
  APPROVED: ['Đã hoàn tiền', 'success'],
  REJECTED: ['Đã từ chối', 'error'],
  REFUND_PENDING: ['Cổng thanh toán đang xử lý', 'warning'],
  REFUND_FAILED: ['Hoàn tiền lỗi', 'error'],
};

export default function StaffRefunds() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [chatItem, setChatItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const permission = await refundService.staffAccess();
      setAccess(permission);
      if (permission?.shiftLeader) setItems(await refundService.staffList());
    } catch (err) { setError(err.message || 'Không thể tải yêu cầu hoàn tiền.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const pending = useMemo(() => items.filter((item) => item.status === 'REQUESTED').length, [items]);

  const approve = async (item) => {
    setBusy(true); setError('');
    try {
      const updated = await refundService.staffApprove(item.id);
      setItems((list) => list.map((row) => row.id === updated.id ? updated : row));
    } catch (err) { setError(err.message || 'Không thể duyệt yêu cầu.'); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    setBusy(true); setError('');
    try {
      const updated = await refundService.staffReject(rejecting.id, reason);
      setItems((list) => list.map((row) => row.id === updated.id ? updated : row));
      setRejecting(null); setReason('');
    } catch (err) { setError(err.message || 'Không thể từ chối yêu cầu.'); }
    finally { setBusy(false); }
  };

  const openChat = async (item) => {
    setChatItem(item);
    setMessages(await refundService.staffMessages(item.id));
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    if (!content || !chatItem) return;
    const message = await refundService.staffSendMessage(chatItem.id, content);
    setMessages((list) => [...list, message]); setMessageText('');
  };

  if (loading) return <Box py={8} textAlign="center"><CircularProgress /></Box>;
  if (!access?.shiftLeader) return <Alert severity="warning">Chỉ staff trưởng được xem và xử lý yêu cầu hoàn tiền.</Alert>;

  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={3}>
      <Box><Typography variant="h4" fontWeight={900}><CurrencyExchangeRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Yêu cầu hoàn tiền</Typography><Typography color="text.secondary">Kiểm tra mã vé, check-in và chính sách trước khi duyệt.</Typography></Box>
      <Chip label={`${pending} yêu cầu cần xử lý`} color={pending ? 'warning' : 'success'} sx={{ fontWeight: 800 }} />
    </Stack>
    <Alert severity="info" sx={{ mb: 2 }}>Dưới {money(access.refundApprovalThreshold)}: staff trưởng được duyệt trực tiếp. Từ ngưỡng này trở lên: tự động chuyển Admin.</Alert>
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    <Card><CardContent sx={{ p: 0 }}><TableContainer><Table>
      <TableHead><TableRow><TableCell>Khách / mã vé</TableCell><TableCell>Phim</TableCell><TableCell>Số tiền</TableCell><TableCell>Lý do</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Xử lý</TableCell></TableRow></TableHead>
      <TableBody>{items.map((item) => {
        const status = meta[item.status] || [item.status, 'default'];
        return <TableRow key={item.id} hover>
          <TableCell><Typography fontWeight={800}>{item.customerName || item.customerEmail}</Typography><Typography variant="caption" color="text.secondary">{item.ticketCode} · {item.ticketCheckedIn ? 'Đã check-in' : 'Chưa check-in'}</Typography></TableCell>
          <TableCell>{item.movieTitle || '—'}<Typography variant="caption" display="block" color="text.secondary">Suất: {dateTime(item.showtimeStart)} · Gửi: {dateTime(item.createdAt)}</Typography></TableCell><TableCell sx={{ fontWeight: 800 }}>{money(item.amount)}</TableCell>
          <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2">{item.reason}</Typography>{item.rejectionReason && <Typography variant="caption" color="error">Từ chối: {item.rejectionReason}</Typography>}</TableCell>
          <TableCell><Chip size="small" label={status[0]} color={status[1]} /></TableCell>
          <TableCell align="right"><Stack direction="row" justifyContent="flex-end" spacing={1}><Button size="small" startIcon={<ChatRoundedIcon />} onClick={() => openChat(item)}>Chat</Button>{item.status === 'REQUESTED' && <><Button size="small" variant="contained" color="success" startIcon={<CheckCircleRoundedIcon />} disabled={busy} onClick={() => approve(item)}>Duyệt</Button><Button size="small" color="error" startIcon={<CancelRoundedIcon />} disabled={busy} onClick={() => setRejecting(item)}>Từ chối</Button></>}</Stack></TableCell>
        </TableRow>;
      })}{items.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>Chưa có yêu cầu hoàn tiền.</TableCell></TableRow>}</TableBody>
    </Table></TableContainer></CardContent></Card>
    <Dialog open={Boolean(rejecting)} onClose={() => !busy && setRejecting(null)} fullWidth maxWidth="sm"><DialogTitle>Từ chối yêu cầu hoàn tiền</DialogTitle><DialogContent><TextField autoFocus fullWidth multiline minRows={3} label="Lý do từ chối" value={reason} onChange={(event) => setReason(event.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setRejecting(null)}>Hủy</Button><Button color="error" variant="contained" disabled={busy || reason.trim().length < 5} onClick={reject}>Xác nhận từ chối</Button></DialogActions></Dialog>
    <Dialog open={Boolean(chatItem)} onClose={() => setChatItem(null)} fullWidth maxWidth="sm"><DialogTitle><ChatRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Trao đổi với {chatItem?.customerName}</DialogTitle><DialogContent dividers><Stack spacing={1.2} sx={{ minHeight: 300, maxHeight: 430, overflowY: 'auto' }}>{messages.map((message) => { const mine = String(message.senderId) === String(user?.id); return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '78%', bgcolor: mine ? 'primary.main' : 'action.hover', color: mine ? 'primary.contrastText' : 'text.primary', px: 2, py: 1.2, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}><Typography variant="caption" sx={{ opacity: .75 }}>{mine ? 'Bạn' : message.senderName}</Typography><Typography variant="body2">{message.content}</Typography></Box>; })}</Stack></DialogContent><DialogActions sx={{ p: 2 }}><TextField fullWidth size="small" placeholder="Nhắn cho khách hàng..." value={messageText} onChange={(event) => setMessageText(event.target.value)} /><Button variant="contained" disabled={!messageText.trim()} onClick={sendMessage}><SendRoundedIcon /></Button></DialogActions></Dialog>
  </Box>;
}
