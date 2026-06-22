import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import { Html5Qrcode } from 'html5-qrcode';

const READER_ID = 'qr-reader-region';

/**
 * Dialog quét mã QR bằng camera.
 *
 * Props:
 *   open      — mở/đóng dialog
 *   onClose   — đóng dialog
 *   onScan    — callback nhận chuỗi đã quét được (string)
 *   title     — tiêu đề tuỳ chọn
 */
const QrScannerDialog = ({ open, onClose, onScan, title = 'Quét mã QR vé' }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');

  const handleClose = () => {
    setError('');
    onClose?.();
  };

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    let startTimer = null;

    const stop = () => {
      // Html5Qrcode.stop() chỉ hợp lệ khi đang chạy; bọc try để tránh ném lỗi khi đóng
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return Promise.resolve();
      return s
        .stop()
        .then(() => s.clear())
        .catch(() => {});
    };

    const handleSuccess = (decodedText) => {
      if (cancelled) return;
      cancelled = true;
      // Dừng camera trước rồi mới trả kết quả để tránh quét lặp
      stop().finally(() => onScan?.(decodedText));
    };

    const fail = (msg) => {
      if (!cancelled) setError(msg);
    };

    // Camera trên web chỉ chạy ở secure context (https hoặc localhost).
    // Mở qua IP LAN trên HTTP → getUserMedia không tồn tại / fail im lặng (màn hình đen).
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail(
        'Trình duyệt chỉ cho phép camera trên https hoặc localhost. ' +
          'Hãy mở trang qua https/localhost, hoặc nhập mã vé thủ công.',
      );
      return undefined;
    }

    const begin = async () => {
      try {
        // Xin quyền camera tường minh trước để trình duyệt hiện hộp thoại cấp quyền,
        // và để nắm chắc lỗi NotAllowed/NotFound thay vì màn hình đen câm.
        const probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        probe.getTracks().forEach((t) => t.stop());
        if (cancelled) return;

        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          handleSuccess,
          // bỏ qua các khung không đọc được (gọi liên tục) — không log để khỏi nhiễu
          () => {},
        );
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'NotAllowedError') {
          fail('Bạn đã từ chối quyền camera. Hãy cấp lại quyền trong trình duyệt rồi thử lại.');
        } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
          fail('Không tìm thấy camera trên thiết bị. Hãy nhập mã vé thủ công.');
        } else {
          fail('Không thể mở camera. Kiểm tra thiết bị/quyền hoặc dùng nhập mã thủ công.');
        }
      }
    };

    // Chờ Dialog mở xong (transition) và DOM #qr-reader-region đã gắn rồi mới khởi động.
    startTimer = setTimeout(begin, 300);

    return () => {
      cancelled = true;
      if (startTimer) clearTimeout(startTimer);
      stop();
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <QrCodeScannerRoundedIcon color="primary" /> {title}
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Box
              id={READER_ID}
              sx={{
                width: '100%',
                minHeight: 240,
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& video': { width: '100% !important', borderRadius: 2 },
              }}
            >
              <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.7)' }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Cho phép quyền camera khi được hỏi, rồi đưa mã QR vào khung để quét.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QrScannerDialog;
