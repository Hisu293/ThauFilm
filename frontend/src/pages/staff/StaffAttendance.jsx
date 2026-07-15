import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack,
  Dialog, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import WorkHistoryRoundedIcon from '@mui/icons-material/WorkHistoryRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { staffAttendanceService } from '../../services/staffAttendanceService';

const selectedMonth = () => new Date().toISOString().slice(0, 7);
const time = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
const date = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
const duration = (minutes = 0) => `${Math.floor(Number(minutes) / 60)}h ${Number(minutes) % 60}p`;

const QrScannerDialog = ({ open, onClose, onScan }) => {
  useEffect(() => {
    if (!open) return undefined;
    const scanner = new Html5QrcodeScanner('attendance-qr-reader', { fps: 10, qrbox: { width: 220, height: 220 } }, false);
    scanner.render((value) => { onScan(value); scanner.clear().catch(() => {}); }, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [open, onClose, onScan]);
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle>Quét QR chấm công</DialogTitle><DialogContent><Box id="attendance-qr-reader" sx={{ overflow: 'hidden' }} /></DialogContent></Dialog>;
};

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
  const [credential, setCredential] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({ workDate: new Date().toISOString().slice(0, 10), shiftType: 'MORNING', note: '' });

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
    if (!credential.trim()) { setNotice({ type: 'warning', message: 'Vui lòng quét QR hoặc nhập mã PIN trước khi chấm công.' }); return; }
    setBusy(true);
    try {
      const result = type === 'in' ? await staffAttendanceService.checkIn(credential) : await staffAttendanceService.checkOut(credential);
      setToday(result);
      setNotice({ type: 'success', message: type === 'in' ? 'Check-in thành công. Chúc bạn một ca làm việc hiệu quả!' : 'Check-out thành công. Ca làm việc đã được ghi nhận.' });
      await load(false);
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Không thể chấm công.' });
    } finally {
      setBusy(false);
    }
  };

  const registerShift = async () => {
    setBusy(true);
    try { await staffAttendanceService.registerShift(registerForm); setNotice({ type: 'success', message: 'Đã gửi đăng ký ca. Vui lòng chờ quản lý phê duyệt.' }); await load(false); }
    catch (error) { setNotice({ type: 'error', message: error.message || 'Không đăng ký được ca.' }); }
    finally { setBusy(false); }
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
              <TextField size="small" label="Mã PIN hoặc mã từ QR" value={credential} onChange={(e) => setCredential(e.target.value)} inputProps={{ maxLength: 80 }} />
              <Button variant="outlined" startIcon={<QrCodeScannerRoundedIcon />} onClick={() => setScannerOpen(true)}>Quét QR bằng camera</Button>
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

      <Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}><Box sx={{ flex: 1 }}><Typography variant="h6" fontWeight={850}>Đăng ký ca làm</Typography><Typography color="text.secondary">Ca đăng ký sẽ ở trạng thái chờ cho đến khi quản lý duyệt.</Typography></Box><TextField type="date" size="small" label="Ngày" value={registerForm.workDate} onChange={(e) => setRegisterForm((old) => ({ ...old, workDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /><FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Ca</InputLabel><Select label="Ca" value={registerForm.shiftType} onChange={(e) => setRegisterForm((old) => ({ ...old, shiftType: e.target.value }))}><MenuItem value="MORNING">Ca sáng</MenuItem><MenuItem value="AFTERNOON">Ca chiều</MenuItem><MenuItem value="EVENING">Ca tối</MenuItem><MenuItem value="LATE">Ca khuya</MenuItem></Select></FormControl><TextField size="small" label="Ghi chú" value={registerForm.note} onChange={(e) => setRegisterForm((old) => ({ ...old, note: e.target.value }))} /><Button variant="contained" startIcon={<EventAvailableRoundedIcon />} disabled={busy} onClick={registerShift}>Đăng ký</Button></Stack></CardContent></Card>

      <Box>
        <Typography variant="h5" fontWeight={850}>Lịch ca làm việc</Typography>
        <Typography color="text.secondary">Lịch được admin phân trong tháng đã chọn.</Typography>
      </Box>
      <Card><TableContainer><Table>
        <TableHead><TableRow><TableCell>Ngày</TableCell><TableCell>Ca</TableCell><TableCell>Thời gian</TableCell><TableCell>Công việc chính</TableCell><TableCell>Ghi chú</TableCell></TableRow></TableHead>
        <TableBody>
          {schedule.map((item) => <TableRow key={item.id}><TableCell sx={{ fontWeight: 750 }}>{date(item.workDate)}</TableCell><TableCell><Chip size="small" color="primary" label={item.shiftName} /></TableCell><TableCell>{item.shiftTime}</TableCell><TableCell>{item.description}</TableCell><TableCell><Stack spacing={.5}><Typography variant="body2">{item.note || '—'}</Typography><Chip size="small" color={item.approvalStatus === 'APPROVED' ? 'success' : item.approvalStatus === 'REJECTED' ? 'error' : 'warning'} label={item.approvalStatus === 'APPROVED' ? 'Đã duyệt' : item.approvalStatus === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'} /></Stack></TableCell></TableRow>)}
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
            {history.map((item) => <TableRow key={item.id}><TableCell sx={{ fontWeight: 750 }}>{date(item.workDate)}</TableCell><TableCell>{item.shiftName || '—'}</TableCell><TableCell>{time(item.checkInAt)}{item.lateMinutes > 0 && <Typography variant="caption" display="block" color="error.main">Muộn {item.lateMinutes} phút</Typography>}</TableCell><TableCell>{time(item.checkOutAt)}{item.earlyLeaveMinutes > 0 && <Typography variant="caption" display="block" color="warning.main">Sớm {item.earlyLeaveMinutes} phút</Typography>}</TableCell><TableCell>{duration(item.durationMinutes)}</TableCell><TableCell><Chip size="small" color={item.status === 'COMPLETED' ? 'success' : 'warning'} label={item.status === 'COMPLETED' ? 'Hoàn tất' : item.status === 'MISSING_CHECK_OUT' ? 'Thiếu check-out' : 'Đang làm'} /></TableCell></TableRow>)}
            {!history.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>Chưa có dữ liệu trong tháng này.</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
      </Card>
      <QrScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={(value) => { setCredential(value); setScannerOpen(false); setNotice({ type: 'success', message: 'Đã quét QR. Bạn có thể bấm check-in/check-out.' }); }} />
    </Stack>
  );
};

export default StaffAttendance;
