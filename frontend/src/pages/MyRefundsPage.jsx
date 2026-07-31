import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { bookingApi } from '../api/bookingApi';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import { refundStatusLabel } from '../utils/statusLabels';

const STATUS_META = {
  REQUESTED: { label: 'Staff đang kiểm tra', color: 'info' },
  PENDING_APPROVAL: { label: 'Chờ Admin duyệt', color: 'warning' },
  APPROVED: { label: 'Đã hoàn tiền thành công', color: 'success' },
  REJECTED: { label: 'Đã từ chối', color: 'error' },
  REFUND_PENDING: { label: 'Đang hoàn tiền', color: 'warning' },
  REFUND_FAILED: { label: 'Hoàn tiền lỗi', color: 'error' },
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PROCESSING', label: 'Đang xử lý' },
  { key: 'APPROVED', label: 'Đã hoàn tiền' },
  { key: 'REJECTED', label: 'Đã từ chối' },
];

const PROCESSING_STATUSES = new Set(['REQUESTED', 'PENDING_APPROVAL', 'REFUND_PENDING']);

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

const matchesFilter = (item, filter) => {
  const status = String(item.status || '').toUpperCase();
  if (filter === 'ALL') return true;
  if (filter === 'PROCESSING') return PROCESSING_STATUSES.has(status);
  return status === filter;
};

export default function MyRefundsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [support, setSupport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [supportBusy, setSupportBusy] = useState(false);
  const [destination, setDestination] = useState({ bankBin: '', accountNumber: '' });

  const openSupport = async (item) => {
    setSupport(item); setMessages([]); setMessageText(''); setDestination({ bankBin: '', accountNumber: '' });
    try {
      const response = await bookingApi.fetchRefundMessages(item.id);
      setMessages(response?.data?.data ?? response?.data ?? []);
    } catch (err) { setError(err?.message || 'Không thể tải trao đổi hoàn tiền.'); }
  };

  const sendMessage = async () => {
    if (!support || !messageText.trim()) return;
    setSupportBusy(true);
    try {
      const response = await bookingApi.sendRefundMessage(support.id, messageText.trim());
      setMessages((items) => [...items, response?.data?.data ?? response?.data]);
      setMessageText('');
    } catch (err) { setError(err?.message || 'Không thể gửi tin nhắn.'); }
    finally { setSupportBusy(false); }
  };

  const sendQr = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!support || !image) return;
    setSupportBusy(true);
    try {
      const response = await bookingApi.sendRefundQr(support.id, image, messageText.trim());
      setMessages((items) => [...items, response?.data?.data ?? response?.data]);
      setMessageText('');
    } catch (err) { setError(err?.message || 'Không thể gửi QR nhận tiền.'); }
    finally { setSupportBusy(false); }
  };

  const confirmDestination = async () => {
    if (!support) return;
    setSupportBusy(true);
    try {
      const response = await bookingApi.confirmRefundDestination(support.id, destination.bankBin, destination.accountNumber);
      const updated = response?.data?.data ?? response?.data;
      setSupport(updated);
      setItems((items) => items.map((item) => item.id === updated.id ? updated : item));
      setDestination({ bankBin: '', accountNumber: '' });
    } catch (err) { setError(err?.message || 'Không thể xác nhận tài khoản nhận tiền.'); }
    finally { setSupportBusy(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await bookingApi.fetchMyRefundRequests();
      const data = response?.data?.data ?? response?.data ?? response ?? [];
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Không thể tải lịch sử hoàn tiền.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const sortedItems = useMemo(
    () => items.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [items],
  );

  const filteredItems = useMemo(
    () => sortedItems.filter((item) => matchesFilter(item, filter)),
    [filter, sortedItems],
  );

  const stats = useMemo(() => ({
    total: items.length,
    processing: items.filter((item) => PROCESSING_STATUSES.has(String(item.status || '').toUpperCase())).length,
    approved: items.filter((item) => item.status === 'APPROVED').length,
    rejected: items.filter((item) => item.status === 'REJECTED').length,
  }), [items]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, minHeight: '72vh', position: 'relative' }}>
      <LoadingOverlay open={loading} message="Đang tải lịch sử hoàn tiền..." blur />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={950}>Lịch sử hoàn tiền</Typography>
          <Typography color="text.secondary" mt={0.5}>Theo dõi tiến độ, kết quả và lý do xử lý mọi yêu cầu của bạn.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/my-bookings')}>
          Vé của tôi
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Thử lại</Button>} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && items.length > 0 && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
            {[
              { label: 'Tổng yêu cầu', value: stats.total, color: 'primary.main' },
              { label: 'Đang xử lý', value: stats.processing, color: 'warning.main' },
              { label: 'Đã hoàn tiền', value: stats.approved, color: 'success.main' },
              { label: 'Đã từ chối', value: stats.rejected, color: 'error.main' },
            ].map((stat) => (
              <Card key={stat.label} variant="outlined" sx={{ borderRadius: 3, bgcolor: 'rgba(30,41,59,0.48)' }}>
                <CardContent sx={{ '&:last-child': { pb: 2 }, py: 2 }}>
                  <Typography variant="h4" fontWeight={950} color={stat.color}>{stat.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={2.5}>
            {FILTERS.map((item) => (
              <Chip
                key={item.key}
                clickable
                label={item.label}
                color={filter === item.key ? 'primary' : 'default'}
                variant={filter === item.key ? 'filled' : 'outlined'}
                onClick={() => setFilter(item.key)}
              />
            ))}
          </Stack>
        </>
      )}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={CurrencyExchangeRoundedIcon}
          title="Chưa có yêu cầu hoàn tiền"
          description="Các yêu cầu hoàn tiền của bạn sẽ xuất hiện và được cập nhật trạng thái tại đây."
          actionText="Xem vé của tôi"
          onAction={() => navigate('/my-bookings')}
        />
      ) : (
        <Stack spacing={1.5}>
          {filteredItems.map((item) => {
            const status = String(item.status || '').toUpperCase();
            const meta = STATUS_META[status] || { label: refundStatusLabel(status), color: 'default' };
            return (
              <Card key={item.id} variant="outlined" sx={{ borderRadius: 3, bgcolor: 'rgba(30,41,59,0.52)', overflow: 'visible' }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Stack direction="row" spacing={1.5} minWidth={0}>
                      <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,0.12)', color: 'primary.main' }}>
                        <ReceiptLongRoundedIcon />
                      </Box>
                      <Box minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                          <Typography variant="h6" fontWeight={900}>{item.movieTitle || 'Vé xem phim'}</Typography>
                          <Chip size="small" color={meta.color} label={meta.label} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mt={0.35}>
                          Mã vé: <b>{item.ticketCode || '—'}</b> · Mã booking: {item.bookingCode || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          Gửi lúc {dateTime(item.createdAt)}{item.reviewedAt ? ` · Xử lý lúc ${dateTime(item.reviewedAt)}` : ''}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1} flexShrink={0}>
                      <Typography variant="h6" fontWeight={950} color="primary.main">{money(item.amount)}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ChatRoundedIcon />}
                        onClick={() => openSupport(item)}
                      >
                        Chi tiết và hỗ trợ
                      </Button>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                    <Typography variant="body2"><b>Lý do yêu cầu:</b> {item.reason || '—'}</Typography>
                    {status === 'REJECTED' && (
                      <Alert severity="error" sx={{ mt: 1.25 }}>
                        <b>Lý do từ chối:</b> {item.rejectionReason || 'Không có ghi chú.'}
                      </Alert>
                    )}
                    {status === 'REFUND_FAILED' && (
                      <Alert severity="warning" sx={{ mt: 1.25 }}>
                        Giao dịch hoàn tiền chưa thành công. Vui lòng mở chi tiết để trao đổi với staff.
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}

          {!loading && items.length > 0 && filteredItems.length === 0 && (
            <Alert severity="info">Không có yêu cầu phù hợp với bộ lọc này.</Alert>
          )}
        </Stack>
      )}

      <Dialog open={Boolean(support)} onClose={() => !supportBusy && setSupport(null)} fullWidth maxWidth="sm">
        <DialogTitle fontWeight={900}>Trao đổi hoàn tiền</DialogTitle>
        <DialogContent dividers>
          {support?.paidByAnotherUser && <Alert severity="warning" sx={{ mb: 2 }}>Vé thuộc {support.customerName || 'người nhận vé'} nhưng do {support.paidByUserName || support.paidByUserEmail} thanh toán. Tiền chỉ được hoàn cho người thực tế thanh toán.</Alert>}
          {support?.refundMethod === 'AUTOMATIC' && String(support?.paidByUserId) === String(user?.id) && !support?.payoutDestinationConfirmed && <Stack spacing={1.25} sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}><Typography fontWeight={850}>Xác nhận tài khoản nhận hoàn tiền</Typography><Typography variant="body2" color="text.secondary">Chính bạn là người thanh toán. Hãy nhập tài khoản của bạn để PayOS/Bảo Kim chuyển tiền sau khi Staff/Admin duyệt.</Typography><TextField size="small" label="BIN ngân hàng" value={destination.bankBin} onChange={(event) => setDestination((value) => ({ ...value, bankBin: event.target.value.replace(/\D/g, '').slice(0, 10) }))} inputProps={{ inputMode: 'numeric' }} /><TextField size="small" label="Số tài khoản" value={destination.accountNumber} onChange={(event) => setDestination((value) => ({ ...value, accountNumber: event.target.value.replace(/\D/g, '').slice(0, 20) }))} inputProps={{ inputMode: 'numeric' }} /><Button variant="contained" disabled={supportBusy || destination.bankBin.length < 6 || destination.accountNumber.length < 5} onClick={confirmDestination}>Xác nhận tài khoản của tôi</Button></Stack>}
          {support?.refundMethod === 'AUTOMATIC' && support?.payoutDestinationConfirmed && <Alert severity="success" sx={{ mb: 2 }}>Người thanh toán đã xác nhận tài khoản nhận tiền lúc {dateTime(support.payoutConfirmedAt)} · STK {support.bankAccountMasked || 'đã được bảo mật'}.</Alert>}
          <Stack spacing={1.25} sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {messages.map((message) => { const mine = String(message.senderId) === String(user?.id); return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '82%', p: 1.25, borderRadius: 2, bgcolor: mine ? 'primary.main' : 'action.hover', color: mine ? 'primary.contrastText' : 'text.primary' }}><Typography variant="caption">{mine ? 'Bạn' : message.senderName || 'Staff'}</Typography><Typography variant="body2">{message.content}</Typography>{message.imageUrl && <Box component="img" src={message.imageUrl} alt="QR nhận tiền" sx={{ display: 'block', mt: 1, maxWidth: 240, width: '100%', borderRadius: 1 }} />}</Box>; })}
            {messages.length === 0 && <Typography color="text.secondary">Chưa có trao đổi.</Typography>}
          </Stack>
          <TextField fullWidth size="small" sx={{ mt: 2 }} placeholder="Nhắn cho Staff..." value={messageText} onChange={(event) => setMessageText(event.target.value)} />
          {String(support?.paidByUserId) === String(user?.id) && ['REQUESTED', 'PENDING_APPROVAL'].includes(support?.status) && <Button component="label" fullWidth variant="outlined" startIcon={<AddPhotoAlternateRoundedIcon />} disabled={supportBusy} sx={{ mt: 1.25 }}>Gửi QR nhận tiền của tôi<input hidden type="file" accept="image/*" onChange={sendQr} /></Button>}
        </DialogContent>
        <DialogActions><Button onClick={() => setSupport(null)} disabled={supportBusy}>Đóng</Button><Button variant="contained" startIcon={<SendRoundedIcon />} onClick={sendMessage} disabled={supportBusy || !messageText.trim()}>Gửi</Button></DialogActions>
      </Dialog>
    </Container>
  );
}
