import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import CameraswitchRoundedIcon from '@mui/icons-material/CameraswitchRounded';
import { Html5Qrcode } from 'html5-qrcode';

const AttendanceQrScanner = ({ onClose, onScan }) => {
  const reactId = useId();
  const [readerId] = useState(() => `attendance-reader-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const completedRef = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Đang yêu cầu quyền camera…');

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    let disposed = false;

    const stop = async () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      try { if (scanner.isScanning) await scanner.stop(); } catch { /* camera đã dừng */ }
      try { scanner.clear(); } catch { /* vùng đọc đã bị tháo */ }
    };

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở đúng đường dẫn bảo mật và thử lại.');
        return;
      }
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (disposed) return;
        if (!cameras.length) throw new Error('NO_CAMERA');
        const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];
        const scanner = new Html5Qrcode(readerId, { verbose: false });
        scannerRef.current = scanner;
        setStatus(`Đang dùng: ${preferred.label || 'camera mặc định'}`);
        await scanner.start(
          preferred.id,
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          async (decodedText) => {
            if (completedRef.current || disposed) return;
            completedRef.current = true;
            await stop();
            onScanRef.current?.(decodedText);
          },
          () => {},
        );
      } catch (reason) {
        if (disposed) return;
        const name = reason?.name || String(reason);
        if (name.includes('NotAllowed')) setError('Bạn chưa cấp quyền camera. Bấm biểu tượng camera trên thanh địa chỉ, chọn Cho phép rồi thử lại.');
        else if (name.includes('NotFound') || name.includes('NO_CAMERA')) setError('Không tìm thấy camera trên thiết bị này. Bạn vẫn có thể nhập mã thủ công.');
        else setError('Không thể khởi động camera. Hãy đóng ứng dụng khác đang dùng camera rồi thử lại.');
      }
    };

    const timer = window.setTimeout(start, 100);
    return () => { disposed = true; window.clearTimeout(timer); stop(); };
  }, [readerId]);

  return <Card sx={{ border: '1px solid rgba(56,189,248,.45)', boxShadow: '0 18px 60px rgba(0,0,0,.3)' }}>
    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}><Box><Stack direction="row" alignItems="center" spacing={1}><QrCodeScannerRoundedIcon color="primary" /><Typography variant="h6" fontWeight={900}>Quét QR chấm công</Typography></Stack><Typography variant="body2" color="text.secondary">Đưa QR động trên màn hình staff trưởng vào giữa khung.</Typography></Box><Button color="inherit" startIcon={<CloseRoundedIcon />} onClick={onClose}>Đóng</Button></Stack>
      {error ? <Alert severity="error" action={<Button color="inherit" onClick={onClose}>Đóng</Button>}>{error}</Alert> : <>
        <Box id={readerId} sx={{ width: '100%', maxWidth: 560, minHeight: 360, mx: 'auto', bgcolor: '#050505', borderRadius: 3, overflow: 'hidden', display: 'grid', placeItems: 'center', '& video': { width: '100% !important', height: 'auto !important', objectFit: 'cover' } }}><CircularProgress sx={{ color: 'white' }} /></Box>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 1.5 }}><CameraswitchRoundedIcon fontSize="small" color="disabled" /><Typography variant="caption" color="text.secondary">{status}</Typography></Stack>
      </>}
    </CardContent>
  </Card>;
};

export default AttendanceQrScanner;
