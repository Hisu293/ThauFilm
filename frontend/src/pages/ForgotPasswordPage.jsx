import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import AuthLayout from '../layouts/AuthLayout';
import { authService } from '../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      if (step === 'email') {
        await authService.requestPasswordResetOtp(email.trim());
        setStep('reset');
        setNotice('Nếu email tồn tại, mã OTP đã được gửi. Vui lòng kiểm tra cả thư rác.');
      } else {
        if (!/^[0-9]{6}$/.test(otp)) throw new Error('OTP phải gồm đúng 6 chữ số.');
        if (password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');
        await authService.resetPassword(email.trim(), otp, password);
        setNotice('Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Không thể xử lý yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout maxFormWidth={440} mode="login">
      <Typography variant="h4" fontWeight={800} color="#fff" mb={1}>Quên mật khẩu</Typography>
      <Typography color="rgba(255,255,255,.7)" mb={3}>Nhận OTP qua email để đặt lại mật khẩu.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <TextField label="Email" type="email" value={email} disabled={step === 'reset'}
            onChange={(event) => setEmail(event.target.value)} required />
          {step === 'reset' && (
            <>
              <TextField label="Mã OTP" value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }} required />
              <TextField label="Mật khẩu mới" type="password" value={password}
                onChange={(event) => setPassword(event.target.value)} required />
              <TextField label="Xác nhận mật khẩu mới" type="password" value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)} required />
              <Button type="button" disabled={loading}
                onClick={() => authService.requestPasswordResetOtp(email).catch((err) => setError(err.message))}>
                Gửi lại OTP
              </Button>
            </>
          )}
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? <CircularProgress size={22} /> : (step === 'email' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu')}
          </Button>
          <Button component={RouterLink} to="/login">Quay lại đăng nhập</Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
