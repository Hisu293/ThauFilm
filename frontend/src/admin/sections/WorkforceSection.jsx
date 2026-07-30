import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import QRCode from 'qrcode';
import SectionHeader from '../components/SectionHeader';
import { adminService } from '../../services/adminService';
import { adminTheaterService } from '../../services/adminTheaterService';

const monthNow = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const duration = (minutes = 0) => `${Math.floor(Number(minutes) / 60)}h ${Number(minutes) % 60}p`;
const employmentLabel = (type) => type === 'FULL_TIME' ? 'Full-time' : 'Part-time';
const payrollStatus = { DRAFT: 'Nháp', APPROVED: 'Đã duyệt', PAID: 'Đã trả' };

const WorkforceSection = () => {
  const [tab, setTab] = useState(0);
  const [month, setMonth] = useState(monthNow);
  const [state, setState] = useState({ loading: true, error: '', staff: [], theaters: [], schedule: null, payroll: null });
  const [shiftForm, setShiftForm] = useState({
    staffId: '', workDate: today(), shiftType: 'MORNING',
    theaterId: '', tasks: '', note: '',
  });
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [codeForm, setCodeForm] = useState({ workDate: today(), shiftType: 'MORNING' });
  const [attendanceCode, setAttendanceCode] = useState(null);
  const [qrImage, setQrImage] = useState('');

  const load = useCallback(async () => {
    const [year, selectedMonth] = month.split('-').map(Number);
    setState((old) => ({ ...old, loading: true, error: '' }));
    try {
      const [staff, theaters, schedule, payrollData] = await Promise.all([
        adminService.getWorkforceStaff(),
        adminTheaterService.list(),
        adminService.getShiftSchedule(year, selectedMonth),
        adminService.getPayroll(year, selectedMonth),
      ]);
      const activeTheaters = (theaters || []).filter((item) => item.status === 'ACTIVE');
      setState({ loading: false, error: '', staff: staff || [], theaters: activeTheaters, schedule, payroll: payrollData });
      setShiftForm((old) => ({
        ...old,
        staffId: old.staffId || staff?.[0]?.staffId || '',
        theaterId: old.theaterId || activeTheaters[0]?.id || '',
      }));
    } catch (error) {
      setState((old) => ({ ...old, loading: false, error: error.message || 'Không tải được dữ liệu nhân sự.' }));
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const assignments = useMemo(() => state.schedule?.assignments || [], [state.schedule]);
  const definitions = state.schedule?.definitions || [];
  const payrollRows = state.payroll?.records || [];
  const partTimeCount = state.staff.filter((item) => item.employmentType === 'PART_TIME').length;
  const fullTimeCount = state.staff.length - partTimeCount;
  const assignedDays = useMemo(() => new Set(assignments.map((item) => `${item.staffId}-${item.workDate}`)).size, [assignments]);
  const shortages = useMemo(() => (state.schedule?.coverage || []).filter((item) => item.understaffed), [state.schedule]);

  const assign = async () => {
    setBusy(true);
    try {
      await adminService.assignShift(shiftForm);
      setShiftForm((old) => ({ ...old, tasks: '', note: '' }));
      await load();
    } catch (error) {
      setState((old) => ({ ...old, error: error.message || 'Không phân được ca làm.' }));
    } finally { setBusy(false); }
  };

  const removeAssignment = async (id) => {
    setBusy(true);
    try { await adminService.deleteShift(id); await load(); }
    catch (error) { setState((old) => ({ ...old, error: error.message || 'Không xóa được ca làm.' })); }
    finally { setBusy(false); }
  };

  const updateStatus = async (id, status) => {
    setBusy(true);
    try { await adminService.updateShiftStatus(id, status); await load(); }
    catch (error) { setState((old) => ({ ...old, error: error.message || 'Không cập nhật được đăng ký ca.' })); }
    finally { setBusy(false); }
  };

  const generateCode = async () => {
    setBusy(true);
    try {
      const code = await adminService.generateAttendanceCode(codeForm);
      setAttendanceCode(code);
      setQrImage(await QRCode.toDataURL(String(code.qrToken), { width: 240, margin: 2, errorCorrectionLevel: 'H' }));
    } catch (error) { setState((old) => ({ ...old, error: error.message || 'Không tạo được mã chấm công.' })); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await adminService.updateEmploymentProfile(profile.staffId, {
        employmentType: profile.employmentType,
        hourlyRate: Number(profile.hourlyRate || 0), monthlySalary: Number(profile.monthlySalary || 0),
        overtimeHourlyRate: Number(profile.overtimeHourlyRate || 0), defaultAllowance: Number(profile.defaultAllowance || 0),
        shiftLeader: Boolean(profile.shiftLeader),
      });
      setProfile(null); await load();
    } catch (error) { setState((old) => ({ ...old, error: error.message || 'Không lưu được hồ sơ lương.' })); }
    finally { setBusy(false); }
  };

  const savePayroll = async () => {
    setBusy(true);
    try {
      await adminService.updatePayroll(payroll.id, {
        allowance: Number(payroll.allowance || 0), bonus: Number(payroll.bonus || 0),
        deduction: Number(payroll.deduction || 0), status: payroll.status, note: payroll.note || '',
      });
      setPayroll(null); await load();
    } catch (error) { setState((old) => ({ ...old, error: error.message || 'Không cập nhật được bảng lương.' })); }
    finally { setBusy(false); }
  };

  return (
    <>
      <SectionHeader title="Ca làm & bảng lương" subtitle="4 ca vận hành rạp, dùng chung dữ liệu chấm công để tính lương Part-time và Full-time" />
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}><Tab icon={<ScheduleRoundedIcon />} iconPosition="start" label="Phân ca" /><Tab icon={<PaymentsRoundedIcon />} iconPosition="start" label="Bảng lương" /></Tabs>
        <TextField type="month" size="small" label="Tháng làm việc" value={month} onChange={(event) => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      {state.error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={load}>Thử lại</Button>}>{state.error}</Alert>}
      {state.loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box> : tab === 0 ? (
        <Stack spacing={2}>
          {shortages.length > 0 && <Alert severity="warning" icon={<WarningAmberRoundedIcon />}><b>{shortages.length} ca đang thiếu người trong tháng.</b> Gần nhất: {shortages.slice(0, 3).map((item) => `${new Date(`${item.workDate}T00:00:00`).toLocaleDateString('vi-VN')} ${item.shiftName} thiếu ${item.shortage}`).join(' · ')}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {definitions.map((item, index) => <Box key={item.type} className="admin-panel admin-stat-card" sx={{ p: 2.25, '--accent': ['#fbbf24', '#38bdf8', '#a78bfa', '#fb7185'][index] }}><Typography variant="overline" color="text.secondary">{item.name}</Typography><Typography variant="h6" fontWeight={900}>{item.time}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{item.description}</Typography></Box>)}
          </Box>
          <Box className="admin-panel" sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'center' }}>
              <Box sx={{ flex: 1 }}><Typography variant="h6" fontWeight={850}>Mã chấm công QR / PIN theo ca</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Mỗi lần tạo sẽ vô hiệu mã cũ của cùng ngày và ca.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField type="date" size="small" label="Ngày" value={codeForm.workDate} onChange={(e) => setCodeForm((old) => ({ ...old, workDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /><FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Ca</InputLabel><Select label="Ca" value={codeForm.shiftType} onChange={(e) => setCodeForm((old) => ({ ...old, shiftType: e.target.value }))}>{definitions.map((item) => <MenuItem key={item.type} value={item.type}>{item.name}</MenuItem>)}</Select></FormControl><Button variant="contained" startIcon={<QrCode2RoundedIcon />} onClick={generateCode} disabled={busy}>Tạo mã</Button></Stack></Box>
              {attendanceCode && <Stack direction="row" spacing={2} alignItems="center"><Box component="img" src={qrImage} alt="QR chấm công" sx={{ width: 132, bgcolor: 'white', borderRadius: 2, p: 1 }} /><Box><Typography color="text.secondary">Mã PIN</Typography><Typography variant="h3" fontWeight={950} letterSpacing={5}>{attendanceCode.pinCode}</Typography><Typography variant="caption" color="text.secondary">Hiệu lực đến {new Date(attendanceCode.validUntil).toLocaleString('vi-VN')}</Typography></Box></Stack>}
            </Stack>
          </Box>
          <Box className="admin-panel" sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={850} sx={{ mb: 2 }}>Phân ca cho nhân viên</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr 1fr' }, gap: 1.5, alignItems: 'center' }}>
              <FormControl size="small"><InputLabel>Nhân viên</InputLabel><Select label="Nhân viên" value={shiftForm.staffId} onChange={(event) => setShiftForm((old) => ({ ...old, staffId: event.target.value }))}>{state.staff.map((item) => <MenuItem key={item.staffId} value={item.staffId}>{item.staffName || item.staffEmail}</MenuItem>)}</Select></FormControl>
              <TextField type="date" size="small" label="Ngày làm" value={shiftForm.workDate} onChange={(event) => setShiftForm((old) => ({ ...old, workDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <FormControl size="small"><InputLabel>Ca làm</InputLabel><Select label="Ca làm" value={shiftForm.shiftType} onChange={(event) => setShiftForm((old) => ({ ...old, shiftType: event.target.value }))}>{definitions.map((item) => <MenuItem key={item.type} value={item.type}>{item.name}</MenuItem>)}</Select></FormControl>
              <FormControl size="small">
                <InputLabel>Rạp làm việc</InputLabel>
                <Select label="Rạp làm việc" value={shiftForm.theaterId} onChange={(event) => setShiftForm((old) => ({ ...old, theaterId: event.target.value }))}>
                  {state.theaters.map((theater) => (
                    <MenuItem key={theater.id} value={theater.id}>
                      {theater.name} · {theater.address || 'Chưa có địa chỉ'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" label="Nhiệm vụ làm việc" multiline minRows={2} value={shiftForm.tasks} onChange={(event) => setShiftForm((old) => ({ ...old, tasks: event.target.value }))} />
              <TextField size="small" label="Ghi chú" value={shiftForm.note} onChange={(event) => setShiftForm((old) => ({ ...old, note: event.target.value }))} />
              <Button variant="contained" startIcon={<AddRoundedIcon />} disabled={busy || !shiftForm.staffId || !shiftForm.theaterId || !shiftForm.tasks.trim()} onClick={assign}>Phân ca và gửi email</Button>
            </Box>
          </Box>
          <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, pb: 1 }}><Typography variant="h6" fontWeight={850}>Lịch phân ca tháng</Typography><Typography variant="body2" color="text.secondary">{assignedDays} ngày công đã được xếp lịch</Typography></Box>
            <TableContainer><Table><TableHead><TableRow><TableCell>Ngày</TableCell><TableCell>Nhân viên</TableCell><TableCell>Loại nhân sự</TableCell><TableCell>Ca</TableCell><TableCell>Thời gian</TableCell><TableCell>Ghi chú</TableCell><TableCell align="right" /></TableRow></TableHead><TableBody>
              {assignments.map((item) => { const staff = state.staff.find((candidate) => candidate.staffId === item.staffId); return <TableRow key={item.id} className="admin-table-row"><TableCell>{new Date(`${item.workDate}T00:00:00`).toLocaleDateString('vi-VN')}</TableCell><TableCell><Typography fontWeight={800}>{item.staffName}</Typography><Typography variant="caption" color="text.secondary">{item.staffEmail}</Typography></TableCell><TableCell><Chip size="small" label={employmentLabel(staff?.employmentType)} color={staff?.employmentType === 'FULL_TIME' ? 'primary' : 'info'} /></TableCell><TableCell>{item.shiftName}</TableCell><TableCell>{item.shiftTime}</TableCell><TableCell><Stack spacing={.5}><Typography variant="body2"><b>{item.workplace || 'Chưa có địa điểm'}</b></Typography><Typography variant="caption">{item.tasks || 'Chưa có nhiệm vụ'}</Typography><Typography variant="caption" color="text.secondary">{item.note || '—'}</Typography><Chip size="small" variant="outlined" color={item.approvalStatus === 'APPROVED' ? 'success' : item.approvalStatus === 'REJECTED' ? 'error' : 'warning'} label={item.assignmentSource === 'EMPLOYEE' ? `Nhân viên đăng ký · ${item.approvalStatus}` : 'Quản lý phân ca'} /></Stack></TableCell><TableCell align="right">{item.approvalStatus === 'PENDING' && <><Button color="success" size="small" onClick={() => updateStatus(item.id, 'APPROVED')}>Duyệt</Button><Button color="warning" size="small" onClick={() => updateStatus(item.id, 'REJECTED')}>Từ chối</Button></>}<Button color="error" size="small" onClick={() => removeAssignment(item.id)} disabled={busy}><DeleteOutlineRoundedIcon fontSize="small" /></Button></TableCell></TableRow>; })}
              {!assignments.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>Chưa phân ca trong tháng này.</TableCell></TableRow>}
            </TableBody></Table></TableContainer>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            {[['Tổng quỹ lương', money(state.payroll?.totalPayroll), '#4ade80'], ['Nhân viên Part-time', partTimeCount, '#38bdf8'], ['Nhân viên Full-time', fullTimeCount, '#a78bfa']].map(([label, value, color]) => <Box key={label} className="admin-panel admin-stat-card" sx={{ p: 2.5, '--accent': color }}><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>{value}</Typography></Box>)}
          </Box>
          <Alert severity="info">Part-time = giờ chấm công thực tế × lương giờ. Full-time = lương tháng + OT + phụ cấp + thưởng − khấu trừ.</Alert>
          <Box className="admin-panel" sx={{ overflow: 'hidden' }}><TableContainer><Table><TableHead><TableRow><TableCell>Nhân viên</TableCell><TableCell>Hình thức</TableCell><TableCell>Giờ thực tế</TableCell><TableCell>OT</TableCell><TableCell>Lương cơ bản</TableCell><TableCell>Cộng / trừ</TableCell><TableCell>Tổng nhận</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead><TableBody>
            {payrollRows.map((item) => <TableRow key={item.id} className="admin-table-row"><TableCell><Typography fontWeight={800}>{item.staffName}</Typography><Typography variant="caption" color="text.secondary">{item.staffEmail}</Typography></TableCell><TableCell><Chip size="small" label={employmentLabel(item.employmentType)} color={item.employmentType === 'FULL_TIME' ? 'primary' : 'info'} /></TableCell><TableCell>{duration(item.regularMinutes)}</TableCell><TableCell>{duration(item.overtimeMinutes)}<Typography variant="caption" display="block" color="text.secondary">{money(item.overtimePay)}</Typography></TableCell><TableCell>{money(item.baseSalary)}</TableCell><TableCell><Typography variant="caption" color="success.main">+{money(Number(item.allowance) + Number(item.bonus))}</Typography><Typography variant="caption" display="block" color="error.main">−{money(item.deduction)}</Typography></TableCell><TableCell><Typography fontWeight={900} color="#4ade80">{money(item.totalSalary)}</Typography></TableCell><TableCell><Chip size="small" label={payrollStatus[item.status]} color={item.status === 'PAID' ? 'success' : item.status === 'APPROVED' ? 'warning' : 'default'} /></TableCell><TableCell align="right"><Stack direction="row" justifyContent="flex-end"><Button size="small" onClick={() => setProfile(state.staff.find((staff) => staff.staffId === item.staffId))}>Cấu hình</Button><Button size="small" startIcon={<EditRoundedIcon />} onClick={() => setPayroll({ ...item })}>Duyệt lương</Button></Stack></TableCell></TableRow>)}
          </TableBody></Table></TableContainer></Box>
        </Stack>
      )}

      <Dialog open={Boolean(profile)} onClose={() => !busy && setProfile(null)} fullWidth maxWidth="sm"><DialogTitle>Cấu hình hình thức và mức lương</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField disabled label="Nhân viên" value={profile?.staffName || ''} /><FormControlLabel control={<Checkbox checked={Boolean(profile?.shiftLeader)} onChange={(event) => setProfile((old) => ({ ...old, shiftLeader: event.target.checked }))} />} label="Staff trưởng · được mở màn hình QR chấm công động" /><FormControl><InputLabel>Hình thức làm việc</InputLabel><Select label="Hình thức làm việc" value={profile?.employmentType || 'PART_TIME'} onChange={(event) => setProfile((old) => ({ ...old, employmentType: event.target.value }))}><MenuItem value="PART_TIME">Part-time · tính theo giờ thực tế</MenuItem><MenuItem value="FULL_TIME">Full-time · lương tháng + OT</MenuItem></Select></FormControl><TextField type="number" label="Lương theo giờ" value={profile?.hourlyRate || 0} onChange={(event) => setProfile((old) => ({ ...old, hourlyRate: event.target.value }))} /><TextField type="number" label="Lương tháng" value={profile?.monthlySalary || 0} onChange={(event) => setProfile((old) => ({ ...old, monthlySalary: event.target.value }))} /><TextField type="number" label="Mức lương OT / giờ" value={profile?.overtimeHourlyRate || 0} onChange={(event) => setProfile((old) => ({ ...old, overtimeHourlyRate: event.target.value }))} /><TextField type="number" label="Phụ cấp mặc định / tháng" value={profile?.defaultAllowance || 0} onChange={(event) => setProfile((old) => ({ ...old, defaultAllowance: event.target.value }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setProfile(null)}>Hủy</Button><Button variant="contained" onClick={saveProfile} disabled={busy}>Lưu cấu hình</Button></DialogActions></Dialog>

      <Dialog open={Boolean(payroll)} onClose={() => !busy && setPayroll(null)} fullWidth maxWidth="sm"><DialogTitle>Duyệt bảng lương tháng</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField disabled label="Nhân viên" value={payroll?.staffName || ''} /><TextField type="number" label="Phụ cấp" value={payroll?.allowance || 0} onChange={(event) => setPayroll((old) => ({ ...old, allowance: event.target.value }))} /><TextField type="number" label="Thưởng" value={payroll?.bonus || 0} onChange={(event) => setPayroll((old) => ({ ...old, bonus: event.target.value }))} /><TextField type="number" label="Khấu trừ" value={payroll?.deduction || 0} onChange={(event) => setPayroll((old) => ({ ...old, deduction: event.target.value }))} /><FormControl><InputLabel>Trạng thái</InputLabel><Select label="Trạng thái" value={payroll?.status || 'DRAFT'} onChange={(event) => setPayroll((old) => ({ ...old, status: event.target.value }))}><MenuItem value="DRAFT">Nháp</MenuItem><MenuItem value="APPROVED">Đã duyệt</MenuItem><MenuItem value="PAID">Đã trả</MenuItem></Select></FormControl><TextField label="Ghi chú" multiline minRows={2} value={payroll?.note || ''} onChange={(event) => setPayroll((old) => ({ ...old, note: event.target.value }))} /><Alert severity="success">Tổng thực nhận dự kiến: {money(Number(payroll?.baseSalary || 0) + Number(payroll?.overtimePay || 0) + Number(payroll?.allowance || 0) + Number(payroll?.bonus || 0) - Number(payroll?.deduction || 0))}</Alert></Stack></DialogContent><DialogActions><Button onClick={() => setPayroll(null)}>Hủy</Button><Button variant="contained" onClick={savePayroll} disabled={busy}>Lưu bảng lương</Button></DialogActions></Dialog>
    </>
  );
};

export default WorkforceSection;
