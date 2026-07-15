import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import QRCode from 'qrcode';
import { staffAttendanceService } from '../../services/staffAttendanceService';

const StaffAttendanceDisplay = () => {
  const [code, setCode] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next = await staffAttendanceService.dynamicAttendanceQr();
      const image = await QRCode.toDataURL(String(next.qrToken), {
        width: 520, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#08080c', light: '#ffffff' },
      });
      setCode(next);
      setQrImage(image);
      setRemaining(Math.max(1, Number(next.expiresInSeconds || 60)));
      setError('');
    } catch (e) {
      setError(e.message || 'Không thể tạo QR chấm công động.');
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (code && remaining === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [code, remaining, refresh]);

  return <Stack spacing={3} sx={{ minHeight: 'calc(100vh - 150px)' }}>
    <Box textAlign="center"><Typography variant="h4" fontWeight={950}>QR chấm công động</Typography><Typography color="text.secondary">Mã tự đổi sau mỗi 60 giây. Nhân viên mở camera tại trang chấm công để quét.</Typography></Box>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={refresh}>Thử lại</Button>}>{error}</Alert>}
    {!code && !error ? <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}><CircularProgress /></Box> : code && <Card sx={{ flex: 1, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, rgba(229,9,20,.18), transparent 48%)' }}>
      <CardContent sx={{ width: '100%', textAlign: 'center', py: { xs: 3, md: 5 } }}>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}><QrCode2RoundedIcon color="primary" /><Typography fontWeight={850}>{code.shiftName} · {code.shiftTime}</Typography></Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Staff trưởng: {code.leaderName}</Typography>
        <Box component="img" src={qrImage} alt="QR chấm công động" sx={{ width: { xs: 280, sm: 400, lg: 470 }, maxWidth: '90%', bgcolor: 'white', borderRadius: 4, p: 1.5, my: 2.5, boxShadow: '0 22px 70px rgba(0,0,0,.45)' }} />
        <Box sx={{ width: { xs: '90%', sm: 430 }, mx: 'auto' }}><Stack direction="row" justifyContent="space-between" mb={.75}><Typography color="text.secondary">QR tiếp theo</Typography><Typography fontWeight={900} color={remaining <= 10 ? 'error.main' : 'primary.main'}>{remaining} giây</Typography></Stack><LinearProgress variant="determinate" value={(remaining / 60) * 100} color={remaining <= 10 ? 'error' : 'primary'} sx={{ height: 10, borderRadius: 10 }} /></Box>
        <Button startIcon={<RefreshRoundedIcon />} sx={{ mt: 2 }} onClick={refresh}>Đồng bộ mã</Button>
      </CardContent>
    </Card>}
  </Stack>;
};

export default StaffAttendanceDisplay;
