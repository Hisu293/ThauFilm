import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AuthLayout from '../layouts/AuthLayout';
import { authService } from '../services/authService';

/* ─── Validation helpers ─────────────────────────────────────────── */
// Backend requires gmail.com addresses and exactly 10 digit phone numbers
const EMAIL_RE = /^[^\s@]+@gmail\.com$/;
const PHONE_RE = /^[0-9]{10}$/;

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#e50914' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Rất yếu',    color: '#e50914' },
    { label: 'Yếu',        color: '#ff6b35' },
    { label: 'Trung bình', color: '#ffc107' },
    { label: 'Mạnh',       color: '#4caf50' },
    { label: 'Rất mạnh',   color: '#00e676' },
  ];
  return { score, ...map[score] };
}

/* ─── Left-panel copy (register-specific) ───────────────────────── */
/* ─── Component ─────────────────────────────────────────────────── */
const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName:        '',
    email:           '',
    phone:           '',
    password:        '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer:   '',
  });
  const [showPw,        setShowPw]        = useState(false);
  const [showCpw,       setShowCpw]       = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [serverError,   setServerError]   = useState('');
  const [loading,        setLoading]        = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ── Derived validation errors (only shown after first submit) ── */
  const errors = useMemo(() => {
    if (!submitted) return {};
    const e = {};
    if (!form.fullName.trim())
      e.fullName = 'Vui lòng nhập họ và tên.';
  // username not required by backend, removed from form
    if (!form.email.trim())
      e.email = 'Vui lòng nhập địa chỉ email.';
    else if (!EMAIL_RE.test(form.email.trim()))
      e.email = 'Vui lòng nhập địa chỉ Gmail hợp lệ.';
    if (!form.phone.trim())
      e.phone = 'Vui lòng nhập số điện thoại.';
    else if (!PHONE_RE.test(form.phone.trim()))
      e.phone = 'Số điện thoại phải gồm đúng 10 chữ số.';
    if (!form.password)
      e.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.length < 6)
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!form.confirmPassword)
      e.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    if (!form.securityQuestion.trim())
      e.securityQuestion = 'Vui lòng nhập câu hỏi bảo mật.';
    if (!form.securityAnswer.trim())
      e.securityAnswer = 'Vui lòng nhập câu trả lời bảo mật.';
    return e;
  }, [submitted, form]);

  /* ── Live mismatch — shown before submit ── */
  const liveMismatch =
    form.confirmPassword.length > 0 &&
    form.password.length > 0 &&
    form.password !== form.confirmPassword;

  const pwStrength  = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const strengthPct = (pwStrength.score / 4) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    const hasErrors =
      !form.fullName.trim() ||
      !form.email.trim() ||
      !EMAIL_RE.test(form.email.trim()) ||
      !form.phone.trim() ||
      !PHONE_RE.test(form.phone.trim()) ||
      !form.password ||
      form.password.length < 6 ||
      form.password !== form.confirmPassword ||
      !form.securityQuestion.trim() ||
      !form.securityAnswer.trim();

    if (hasErrors) return;

    setLoading(true);
    try {
      const resp = await authService.register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        securityQuestion: form.securityQuestion.trim(),
        securityAnswer: form.securityAnswer.trim(),
      });
      // backend wraps payload in { success, message, data: AuthResponse }
      const payload = resp?.data?.data || resp?.data;
      if (payload?.accessToken) {
        localStorage.setItem('cinema_token', payload.accessToken);
      }
      if (payload?.refreshToken) {
        localStorage.setItem('cinema_refresh_token', payload.refreshToken);
      }
      if (payload) {
        localStorage.setItem('cinema_user', JSON.stringify(payload));
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setServerError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout maxFormWidth={460}>

      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 0.5 }}>
        <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}
        >
          ThauFilm
        </Typography>
      </Stack>

      {/* ── Heading ── */}
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
          Tạo tài khoản
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.70)' }}>
          Tham gia cùng chúng tôi và bắt đầu đặt vé xem phim ngay hôm nay.
        </Typography>
      </Stack>

      {/* ── Success alert ── */}
      <Collapse in={success}>
        <Alert
          severity="success"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(76,175,80,0.15)',
            color: '#a5d6a7',
            border: '1px solid rgba(76,175,80,0.35)',
          }}
        >
          Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập…
        </Alert>
      </Collapse>

      {/* ── Error summary ── */}
      <Collapse in={submitted && Object.keys(errors).length > 0 && !success}>
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(229,9,20,0.12)',
            color: '#ff8a80',
            border: '1px solid rgba(229,9,20,0.35)',
          }}
        >
          Vui lòng kiểm tra và sửa các lỗi bên dưới trước khi tiếp tục.
        </Alert>
      </Collapse>

      {/* ── Server error ── */}
      <Collapse in={Boolean(serverError)}>
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(229,9,20,0.12)',
            color: '#ff8a80',
            border: '1px solid rgba(229,9,20,0.35)',
          }}
        >
          {serverError}
        </Alert>
      </Collapse>

      {/* ── Form ── */}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>

          {/* Full Name */}
          <TextField
            label="Họ và tên"
            name="fullName"
            id="reg-fullname"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName || ' '}
            autoComplete="name"
            fullWidth
            required
          />



          {/* Email */}
          <TextField
            label="Địa chỉ email"
            name="email"
            id="reg-email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
            autoComplete="email"
            fullWidth
            required
          />

          {/* Phone */}
          <TextField
            label="Số điện thoại"
            name="phone"
            id="reg-phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            error={Boolean(errors.phone)}
            helperText={errors.phone || ' '}
            autoComplete="tel"
            fullWidth
            required
          />

          <TextField
            label="Câu hỏi bảo mật"
            name="securityQuestion"
            id="reg-security-question"
            value={form.securityQuestion}
            onChange={handleChange}
            error={Boolean(errors.securityQuestion)}
            helperText={errors.securityQuestion || 'Ví dụ: Tên trường tiểu học của bạn là gì?'}
            autoComplete="off"
            fullWidth
            required
          />

          <TextField
            label="Câu trả lời bảo mật"
            name="securityAnswer"
            id="reg-security-answer"
            value={form.securityAnswer}
            onChange={handleChange}
            error={Boolean(errors.securityAnswer)}
            helperText={errors.securityAnswer || 'Hãy chọn câu trả lời dễ nhớ nhưng khó đoán.'}
            autoComplete="off"
            fullWidth
            required
          />

          {/* Password + strength bar */}
          <Box>
            <TextField
              label="Mật khẩu"
              name="password"
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              error={Boolean(errors.password)}
              helperText={errors.password || ' '}
              autoComplete="new-password"
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPw((v) => !v)}
                      edge="end"
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {showPw ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {form.password.length > 0 && (
              <Box sx={{ mt: -1.5, mb: 0.5, px: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={strengthPct}
                  sx={{
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: pwStrength.color,
                      transition: 'width 0.4s ease',
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: pwStrength.color, fontWeight: 700, mt: 0.4, display: 'block' }}
                >
                  {pwStrength.label}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Confirm Password */}
          <TextField
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            id="reg-confirm-password"
            type={showCpw ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={handleChange}
            error={Boolean(errors.confirmPassword) || liveMismatch}
            helperText={
              errors.confirmPassword
                ? errors.confirmPassword
                : liveMismatch
                ? 'Mật khẩu xác nhận không khớp.'
                : ' '
            }
            autoComplete="new-password"
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showCpw ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                    onClick={() => setShowCpw((v) => !v)}
                    edge="end"
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {showCpw ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Register Button */}
          <Button
            id="reg-submit"
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={loading || success}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              py: 1.35,
              fontSize: '1rem',
              borderRadius: '10px',
              mt: 1,
              '&:focus-visible': {
                outline: '2px solid #e50914',
                outlineOffset: '3px',
              },
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Tạo tài khoản'}
          </Button>

          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', mt: 0.5 }}
          >
            Đã có tài khoản?{' '}
            <Button
              id="reg-login-link"
              component={RouterLink}
              to="/login"
              variant="text"
              color="primary"
              sx={{ textTransform: 'none', fontWeight: 800, px: 0.5, minWidth: 'unset' }}
            >
              Đăng nhập
            </Button>
          </Typography>

        </Stack>
      </Box>
    </AuthLayout>
  );
};

export default RegisterPage;
