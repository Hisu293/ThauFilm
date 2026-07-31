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
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { bookingApi } from '../api/bookingApi';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
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
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                        onClick={() => navigate(`/my-bookings/${item.bookingId}?support=refund`)}
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
    </Container>
  );
}
