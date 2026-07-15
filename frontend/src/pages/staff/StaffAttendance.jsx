import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import WorkHistoryRoundedIcon from '@mui/icons-material/WorkHistoryRounded';
import { staffAttendanceService } from '../../services/staffAttendanceService';

const selectedMonth = () => new Date().toISOString().slice(0, 7);
const time = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
const date = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
const duration = (minutes = 0) => `${Math.floor(Number(minutes) / 60)}h ${Number(minutes) % 60}p`;

const StaffAttendance = () => {
  const [month, setMonth] = useState(selectedMonth);
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState(null);
  const [todayShift, setTodayShift] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const load = useCallback(async (clearNotice = true) => {
    const [year, selected] = month.split('-').map(Number);
    setLoading(true);
    try {
      const [todayData, historyData, shiftData, scheduleData] = await Promise.all([
        staffAttendanceService.today(),
        staffAttendanceService.history(year, selected),
        staffAttendanceService.todayShift(),
        staffAttendanceService.schedule(year, selected),
      ]);
      setToday(todayData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setTodayShift(shiftData);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      if (clearNotice) setNotice({ type: '', message: '' });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Không tải được dữ liệu chấm công.' });
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalMinutes = useMemo(() => history.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0), [history]);
  const action = async (type) => {
    setBusy(true);
    try {
      const result = type === 'in' ? await staffAttendanceService.checkIn() : await staffAttendanceService.checkOut();
      setToday(result);
      setNotice({ type: 'success', message: type === 'in' ? 'Check-in thành công. Chúc bạn một ca làm việc hiệu quả!' : 'Check-out thành công. Ca làm việc đã được ghi nhận.' });
      await load(false);
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Không thể chấm công.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !today && !history.length) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 420 }}><CircularProgress /></Box>;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={900}>Chấm công</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>Ghi nhận giờ bắt đầu và kết thúc ca làm việc của bạn.</Typography>
      </Box>
      {notice.message && <Alert severity={notice.type}>{notice.message}</Alert>}

      <Card sx={{ overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 10%, rgba(229,9,20,.22), transparent 42%), radial-gradient(circle at 90% 90%, rgba(99,102,241,.18), transparent 38%)' }} />
        <CardContent sx={{ position: 'relative', p: { xs: 3, md: 5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={4}>
            <Box>
              <Chip icon={<AccessTimeRoundedIcon />} label={today?.status === 'WORKING' ? 'Đang trong ca' : today?.status === 'COMPLETED' ? 'Đã hoàn tất ca' : 'Chưa bắt đầu'} color={today?.status === 'WORKING' ? 'warning' : today?.status === 'COMPLETED' ? 'success' : 'default'} />
              <Typography variant="h2" fontWeight={900} sx={{ mt: 2, letterSpacing: '-0.04em' }}>{now.toLocaleTimeString('vi-VN')}</Typography>
              <Typography color="text.secondary">{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</Typography>
            </Box>
            <Stack spacing={1.5} sx={{ minWidth: { md: 270 } }}>
              {!today && <Button size="large" variant="contained" startIcon={<LoginRoundedIcon />} disabled={busy || !todayShift} onClick={() => action('in')}>{todayShift ? 'Check-in bắt đầu ca' : 'Chưa được phân ca hôm nay'}</Button>}
              {today?.status === 'WORKING' && <Button size="large" variant="contained" color="warning" startIcon={<LogoutRoundedIcon />} disabled={busy} onClick={() => action('out')}>Check-out kết thúc ca</Button>}
              {today?.status === 'COMPLETED' && <Button size="large" variant="outlined" startIcon={<WorkHistoryRoundedIcon />} disabled>Ca hôm nay đã hoàn tất</Button>}
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Check-in</Typography><Typography fontWeight={800}>{time(today?.checkInAt)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Check-out</Typography><Typography fontWeight={800}>{time(today?.checkOutAt)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Thời gian ca</Typography><Typography fontWeight={800} color="primary.main">{today ? duration(today.durationMinutes) : '0h 0p'}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Ca được phân</Typography><Typography fontWeight={800}>{todayShift ? `${todayShift.shiftName} · ${todayShift.shiftTime}` : 'Chưa có lịch'}</Typography></Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h5" fontWeight={850}>Lịch ca làm việc</Typography>
        <Typography color="text.secondary">Lịch được admin phân trong tháng đã chọn.</Typography>
      </Box>
      <Card><TableContainer><Table>
        <TableHead><TableRow><TableCell>Ngày</TableCell><TableCell>Ca</TableCell><TableCell>Thời gian</TableCell><TableCell>Công việc chính</TableCell><TableCell>Ghi chú</TableCell></TableRow></TableHead>
        <TableBody>
          {schedule.map((item) => <TableRow key={item.id}><TableCell sx={{ fontWeight: 750 }}>{date(item.workDate)}</TableCell><TableCell><Chip size="small" color="primary" label={item.shiftName} /></TableCell><TableCell>{item.shiftTime}</TableCell><TableCell>{item.description}</TableCell><TableCell>{item.note || '—'}</TableCell></TableRow>)}
          {!schedule.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>Chưa có lịch ca trong tháng này.</TableCell></TableRow>}
        </TableBody>
      </Table></TableContainer></Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box><Typography variant="h5" fontWeight={850}>Lịch sử chấm công</Typography><Typography color="text.secondary">{history.length} ngày công · Tổng {duration(totalMinutes)}</Typography></Box>
        <TextField type="month" size="small" label="Chọn tháng" value={month} onChange={(event) => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <Card>
        <TableContainer><Table>
          <TableHead><TableRow><TableCell>Ngày làm việc</TableCell><TableCell>Ca</TableCell><TableCell>Check-in</TableCell><TableCell>Check-out</TableCell><TableCell>Thời gian</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead>
          <TableBody>
            {history.map((item) => <TableRow key={item.id}><TableCell sx={{ fontWeight: 750 }}>{date(item.workDate)}</TableCell><TableCell>{item.shiftName || '—'}</TableCell><TableCell>{time(item.checkInAt)}</TableCell><TableCell>{time(item.checkOutAt)}</TableCell><TableCell>{duration(item.durationMinutes)}</TableCell><TableCell><Chip size="small" color={item.status === 'COMPLETED' ? 'success' : 'warning'} label={item.status === 'COMPLETED' ? 'Hoàn tất' : item.status === 'MISSING_CHECK_OUT' ? 'Thiếu check-out' : 'Đang làm'} /></TableCell></TableRow>)}
            {!history.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>Chưa có dữ liệu trong tháng này.</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
      </Card>
    </Stack>
  );
};

export default StaffAttendance;
