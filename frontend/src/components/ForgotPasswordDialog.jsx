import { useState } from 'react';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, Stack, Step, StepLabel, Stepper,
  TextField, Typography,
} from '@mui/material';
import { authService } from '../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const steps = ['Xác nhận email', 'Đặt lại mật khẩu'];

export default function ForgotPasswordDialog({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetDialog = () => {
    setStep(0);
    setEmail('');
    setQuestion('');
    setAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetDialog();
    onClose();
  };

  const findAccount = async () => {
    const normalizedEmail = email.trim();
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authService.forgotPassword(normalizedEmail);
      const securityQuestion = response?.data?.data ?? response?.data;
      if (typeof securityQuestion !== 'string' || !securityQuestion.trim()) {
        throw new Error('Tài khoản chưa có câu hỏi bảo mật.');
      }
      setEmail(normalizedEmail);
      setQuestion(securityQuestion);
      setAnswer('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setStep(1);
    } catch (requestError) {
      setError(requestError.message || 'Không thể lấy câu hỏi bảo mật.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (!answer.trim()) {
      setError('Vui lòng nhập câu trả lời bảo mật.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ email, answer: answer.trim(), newPassword });
      setSuccess(true);
    } catch (requestError) {
      setNewPassword('');
      setConfirmPassword('');
      setError(requestError.message || 'Câu trả lời bảo mật không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const primaryAction = step === 0 ? findAccount : submitNewPassword;
  const primaryLabel = step === 0 ? 'Tiếp tục' : 'Đổi mật khẩu';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Quên mật khẩu</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
          </Alert>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: { xs: '.7rem', sm: '.8rem' } } }}>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {error && <Alert severity="error">{error}</Alert>}

            {step === 0 && <TextField autoFocus fullWidth required type="email" label="Email đăng ký" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') findAccount(); }} disabled={loading} autoComplete="email" />}

            {step === 1 && (
              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary">Câu hỏi bảo mật</Typography>
                  <Typography fontWeight={750}>{question}</Typography>
                </Box>
                <TextField
                  autoFocus fullWidth required label="Câu trả lời" value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={loading} autoComplete="off"
                />
                <TextField
                  fullWidth required label="Mật khẩu mới" type={showNewPassword ? 'text' : 'password'}
                  value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
                  disabled={loading} autoComplete="new-password"
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNewPassword((value) => !value)} edge="end" aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}>{showNewPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}</IconButton></InputAdornment> }}
                />
                <TextField
                  fullWidth required label="Xác nhận mật khẩu mới" type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') submitNewPassword(); }}
                  disabled={loading} autoComplete="new-password"
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword((value) => !value)} edge="end" aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}>{showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}</IconButton></InputAdornment> }}
                />
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>{success ? 'Đóng' : 'Hủy'}</Button>
        {!success && step > 0 && <Button onClick={() => { setError(''); setStep((value) => value - 1); }} disabled={loading}>Quay lại</Button>}
        {!success && <Button variant="contained" onClick={primaryAction} disabled={loading}>{loading ? <CircularProgress size={21} color="inherit" /> : primaryLabel}</Button>}
      </DialogActions>
    </Dialog>
  );
}
