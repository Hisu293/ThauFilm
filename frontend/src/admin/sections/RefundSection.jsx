import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import adminService from '../../services/adminService';
import SectionState from '../components/SectionState';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
const statusMeta = { REQUESTED: ['Staff đang kiểm tra', 'info'], PENDING_APPROVAL: ['Chờ Admin duyệt', 'warning'], APPROVED: ['Đã hoàn tiền', 'success'], REJECTED: ['Đã từ chối', 'error'], REFUND_PENDING: ['Đang hoàn qua cổng', 'warning'], REFUND_FAILED: ['Hoàn tiền lỗi', 'error'] };

const RefundSection = () => {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [rejecting, setRejecting] = useState(null); const [reason, setReason] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await adminService.getRefundRequests()); } catch (err) { setError(err.message || 'Không thể tải yêu cầu hoàn tiền.'); } finally { setLoading(false); } }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const stats = useMemo(() => ({ pending: items.filter((i) => i.status === 'PENDING_APPROVAL').length, amount: items.filter((i) => i.status === 'PENDING_APPROVAL').reduce((sum, i) => sum + Number(i.amount || 0), 0), approved: items.filter((i) => i.status === 'APPROVED').length }), [items]);
  const patch = (updated) => setItems((list) => list.map((item) => item.id === updated.id ? updated : item));
  const approve = async (item) => { setBusy(true); setError(''); try { patch(await adminService.approveRefund(item.id)); } catch (err) { setError(err.message || 'Không thể duyệt yêu cầu.'); } finally { setBusy(false); } };
  const reject = async () => { setBusy(true); setError(''); try { patch(await adminService.rejectRefund(rejecting.id, reason)); setRejecting(null); setReason(''); } catch (err) { setError(err.message || 'Không thể từ chối yêu cầu.'); } finally { setBusy(false); } };
  return <Box>
    <Grid container spacing={2} mb={3}>{[["Chờ Admin duyệt", stats.pending, '#f59e0b'], ["Tổng tiền đang chờ", money(stats.amount), '#ef4444'], ["Đã hoàn thành", stats.approved, '#22c55e']].map(([label, value, color]) => <Grid item xs={12} md={4} key={label}><Card sx={{ borderTop: `3px solid ${color}` }}><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={950}>{value}</Typography></CardContent></Card></Grid>)}</Grid>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <SectionState loading={loading} error="" empty={!items.length} emptyText="Chưa có yêu cầu hoàn tiền." onRetry={load}>
      <Card><CardContent sx={{ p: 0 }}><TableContainer><Table><TableHead><TableRow><TableCell>Yêu cầu</TableCell><TableCell>Khách hàng</TableCell><TableCell>Vé / phim</TableCell><TableCell>Số tiền</TableCell><TableCell>Lý do</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Quyết định</TableCell></TableRow></TableHead><TableBody>{items.map((item) => { const meta = statusMeta[item.status] || [item.status, 'default']; return <TableRow key={item.id} hover><TableCell><Typography fontWeight={800}>{item.bookingCode}</Typography><Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString('vi-VN')}</Typography></TableCell><TableCell>{item.customerName}<Typography variant="caption" display="block" color="text.secondary">{item.customerEmail}</Typography></TableCell><TableCell>{item.ticketCode}<Typography variant="caption" display="block" color="text.secondary">{item.movieTitle}</Typography></TableCell><TableCell sx={{ fontWeight: 900 }}>{money(item.amount)}</TableCell><TableCell sx={{ maxWidth: 260 }}>{item.reason}{item.rejectionReason && <Typography variant="caption" display="block" color="error">{item.rejectionReason}</Typography>}</TableCell><TableCell><Chip size="small" label={meta[0]} color={meta[1]} /></TableCell><TableCell align="right">{item.status === 'PENDING_APPROVAL' && <Stack direction="row" justifyContent="flex-end" spacing={1}><Button size="small" variant="contained" color="success" startIcon={<PaidRoundedIcon />} disabled={busy} onClick={() => approve(item)}>Duyệt</Button><Button size="small" color="error" startIcon={<CancelRoundedIcon />} disabled={busy} onClick={() => setRejecting(item)}>Từ chối</Button></Stack>}</TableCell></TableRow>; })}</TableBody></Table></TableContainer></CardContent></Card>
    </SectionState>
    <Dialog open={Boolean(rejecting)} onClose={() => !busy && setRejecting(null)} fullWidth maxWidth="sm"><DialogTitle><PendingActionsRoundedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Nhập lý do từ chối</DialogTitle><DialogContent><TextField autoFocus fullWidth multiline minRows={3} label="Lý do gửi cho khách" value={reason} onChange={(event) => setReason(event.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setRejecting(null)}>Hủy</Button><Button variant="contained" color="error" disabled={busy || reason.trim().length < 5} onClick={reject}>Từ chối yêu cầu</Button></DialogActions></Dialog>
  </Box>;
};

export default RefundSection;
