import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import SectionHeader from '../components/SectionHeader';
import { adminService } from '../../services/adminService';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const toInputDateTime = (value) => value ? String(value).slice(0, 16) : '';
const hours = (minutes = 0) => `${(Number(minutes) / 60).toFixed(1)} giờ`;

const AttendanceSection = () => {
  const [month, setMonth] = useState(currentMonth);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ checkInAt: '', checkOutAt: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [year, selectedMonth] = month.split('-').map(Number);
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const data = await adminService.getAttendance(year, selectedMonth);
      setState({ loading: false, error: '', data });
    } catch (error) {
      setState({ loading: false, error: error.message || 'Không tải được dữ liệu chấm công.', data: null });
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const records = useMemo(() => state.data?.records || [], [state.data]);
  const openEdit = (record) => {
    setEditing(record);
    setForm({
      checkInAt: toInputDateTime(record.checkInAt),
      checkOutAt: toInputDateTime(record.checkOutAt),
      note: record.note || '',
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateAttendance(editing.id, {
        checkInAt: form.checkInAt || null,
        checkOutAt: form.checkOutAt || null,
        note: form.note,
      });
      setEditing(null);
      await load();
    } catch (error) {
      setState((previous) => ({ ...previous, error: error.message || 'Không cập nhật được chấm công.' }));
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: 'Tổng nhân viên', value: state.data?.totalStaff || 0, icon: <BadgeRoundedIcon />, color: '#60a5fa' },
    { label: 'Ngày công ghi nhận', value: state.data?.attendanceDays || 0, icon: <EditCalendarRoundedIcon />, color: '#a78bfa' },
    { label: 'Ca hoàn tất', value: state.data?.completedShifts || 0, icon: <CheckCircleRoundedIcon />, color: '#4ade80' },
    { label: 'Tổng giờ làm', value: `${state.data?.totalHours || 0}h`, icon: <AccessTimeRoundedIcon />, color: '#fbbf24' },
  ];

  return (
    <>
      <SectionHeader title="Chấm công nhân viên" subtitle="Theo dõi check-in, check-out và tổng thời gian làm việc theo tháng" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mb: 2 }}>
        <TextField
          type="month"
          size="small"
          label="Tháng chấm công"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 210 }}
        />
      </Stack>

      {state.error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={load}>Thử lại</Button>}>{state.error}</Alert>}
      {state.loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            {cards.map((card) => (
              <Box key={card.label} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': card.color }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" variant="body2">{card.label}</Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: card.color, p: 1, borderRadius: 2, bgcolor: `${card.color}18` }}>{card.icon}</Box>
                </Stack>
              </Box>
            ))}
          </Box>

          <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell>Nhân viên</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Ca làm</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="admin-table-row">
                      <TableCell><Typography fontWeight={800}>{record.staffName || 'Nhân viên'}</Typography><Typography variant="caption" color="text.secondary">{record.staffEmail}</Typography></TableCell>
                      <TableCell>{new Date(`${record.workDate}T00:00:00`).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>{record.shiftName ? <Chip size="small" label={record.shiftName} color="primary" /> : '—'}</TableCell>
                      <TableCell>{formatDateTime(record.checkInAt)}{record.lateMinutes > 0 && <Typography variant="caption" display="block" color="error.main">Muộn {record.lateMinutes} phút · {record.checkInMethod}</Typography>}</TableCell>
                      <TableCell>{formatDateTime(record.checkOutAt)}{record.earlyLeaveMinutes > 0 && <Typography variant="caption" display="block" color="warning.main">Về sớm {record.earlyLeaveMinutes} phút · {record.checkOutMethod}</Typography>}</TableCell>
                      <TableCell>{hours(record.durationMinutes)}</TableCell>
                      <TableCell><Chip size="small" color={record.status === 'COMPLETED' ? 'success' : 'warning'} label={record.status === 'COMPLETED' ? 'Đã hoàn tất' : record.status === 'MISSING_CHECK_OUT' ? 'Thiếu check-out' : 'Đang làm việc'} /></TableCell>
                      <TableCell align="right"><Button size="small" startIcon={<EditCalendarRoundedIcon />} onClick={() => openEdit(record)}>Chỉnh sửa</Button></TableCell>
                    </TableRow>
                  ))}
                  {!records.length && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7, color: 'text.secondary' }}>Chưa có dữ liệu chấm công trong tháng này.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Điều chỉnh chấm công</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nhân viên" value={editing?.staffName || ''} disabled />
            <TextField type="datetime-local" label="Giờ check-in" value={form.checkInAt} onChange={(event) => setForm((old) => ({ ...old, checkInAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="datetime-local" label="Giờ check-out" value={form.checkOutAt} onChange={(event) => setForm((old) => ({ ...old, checkOutAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Ghi chú quản trị" multiline minRows={2} value={form.note} onChange={(event) => setForm((old) => ({ ...old, note: event.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditing(null)} disabled={saving}>Hủy</Button><Button variant="contained" onClick={save} disabled={saving || !form.checkInAt}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></DialogActions>
      </Dialog>
    </>
  );
};

export default AttendanceSection;
