import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AuthLayout from '../layouts/AuthLayout';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';
import { useAuth } from '../context/AuthContext';
import { authService, parseAuthResponse } from '../services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{9,11}$/;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let googleIdentityInitialized = false;
let activeGoogleCredentialHandler = null;

// Nhãn nằm trên ô nhập (kiểu form mới)
const fieldLabelSx = {
  display: 'block',
  mb: 0.75,
  fontSize: '0.9rem',
  fontWeight: 700,
  color: '#fff',
};

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Không thể tải Google Sign-In.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không thể tải Google Sign-In.'));
    document.head.appendChild(script);
  });
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const completeLogin = useCallback((body) => {
    const { user, accessToken, refreshToken } = parseAuthResponse(body);
    if (!accessToken) {
      throw new Error('Phản hồi đăng nhập thiếu accessToken.');
    }

    login(user, accessToken, refreshToken);
    setSuccess(true);
    // Admin/Staff phân quyền chuyển trang
    const role = String(user?.role ?? '').toLowerCase();
    const isAdmin = role.includes('admin');
    const isStaff = role.includes('staff');
    
    let redirectUrl = '/';
    if (isAdmin) redirectUrl = '/admin';
    else if (isStaff) redirectUrl = '/staff/dashboard';

    setTimeout(() => navigate(redirectUrl), 1000);
  }, [login, navigate]);

  useEffect(() => {
    let cancelled = false;

    const initGoogleSignIn = async () => {
      if (!googleClientId) {
        setServerError('Thiếu VITE_GOOGLE_CLIENT_ID để đăng nhập Google.');
        return;
      }

      try {
        await loadGoogleScript();
        if (cancelled || !googleButtonRef.current) {
          return;
        }

        const credentialHandler = async (response) => {
          try {
            setServerError('');
            setGoogleLoading(true);
            if (!response.credential) throw new Error('Google không trả về response.credential.');
            const { data: body } = await authService.googleAuth(response.credential);
            completeLogin(body);
          } catch (err) {
            setServerError(err.message || 'Google đăng nhập thất bại.');
          } finally {
            setGoogleLoading(false);
          }
        };
        activeGoogleCredentialHandler = credentialHandler;

        if (!googleIdentityInitialized) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => activeGoogleCredentialHandler?.(response),
          });
          googleIdentityInitialized = true;
        }

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
          shape: 'rectangular',
        });

      } catch (err) {
        setServerError(err.message || 'Không thể khởi tạo Google Sign-In.');
      }
    };

    initGoogleSignIn();

    return () => {
      cancelled = true;
      activeGoogleCredentialHandler = null;
    };
  }, [completeLogin]);

  const emailError = useMemo(() => {
    if (!submitted) return '';
    const v = email.trim();
    if (!v) return 'Email hoặc số điện thoại là bắt buộc.';
    if (!EMAIL_RE.test(v) && !PHONE_RE.test(v)) return 'Vui lòng nhập email hoặc số điện thoại hợp lệ.';
    return '';
  }, [email, submitted]);

  const passwordError = useMemo(() => {
    if (!submitted) return '';
    if (!password) return 'Mật khẩu là bắt buộc.';
    return '';
  }, [password, submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    const idv = email.trim();
    const hasEmailErr = !idv || (!EMAIL_RE.test(idv) && !PHONE_RE.test(idv));
    const hasPwErr = !password;
    if (hasEmailErr || hasPwErr) return;

    setLoading(true);

    try {
      const { data: body } = await authService.login({ email, password });
      console.log('Login API success:', body);
      completeLogin(body);
    } catch (err) {
      setServerError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout maxFormWidth={420}>
      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 0.5 }}>
        <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}
        >
          ThauFilm
        </Typography>
      </Stack>

      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
          Đăng nhập
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.70)' }}>
          Đăng nhập để tiếp tục trải nghiệm ThauFilm.
        </Typography>
      </Stack>

      <Collapse in={success}>
        <Alert
          icon={<CheckCircleRoundedIcon fontSize="inherit" />}
          severity="success"
          sx={{
            mb: 2.5,
            borderRadius: '10px',
            backgroundColor: 'rgba(76,175,80,0.15)',
            color: '#a5d6a7',
            border: '1px solid rgba(76,175,80,0.35)',
            fontWeight: 600,
          }}
        >
          Đăng nhập thành công! Đang chuyển hướng…
        </Alert>
      </Collapse>

      <Collapse in={Boolean(serverError)}>
        <Alert
          severity="error"
          sx={{
            mb: 2.5,
            borderRadius: '10px',
            backgroundColor: 'rgba(229,9,20,0.12)',
            color: '#ff8a80',
            border: '1px solid rgba(229,9,20,0.35)',
          }}
        >
          {serverError}
        </Alert>
      </Collapse>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2.5}>
          <Box>
            <Typography component="label" htmlFor="login-email" sx={fieldLabelSx}>
              Email hoặc số điện thoại
            </Typography>
            <TextField
              id="login-email"
              placeholder="Email hoặc số điện thoại"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(emailError)}
              helperText={emailError || ' '}
              autoComplete="username"
              fullWidth
              required
              disabled={loading || success || googleLoading}
            />
          </Box>

          <Box>
            <Typography component="label" htmlFor="login-password" sx={fieldLabelSx}>
              Mật khẩu
            </Typography>
            <TextField
              id="login-password"
              placeholder="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(passwordError)}
              helperText={passwordError || ' '}
              autoComplete="current-password"
              fullWidth
              required
              disabled={loading || success || googleLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      sx={{ color: 'rgba(255,255,255,0.75)' }}
                    >
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: -0.5 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                  size="small"
                  disabled={loading || success || googleLoading}
                />
              }
              label="Nhớ tài khoản"
              sx={{ '& .MuiFormControlLabel-label': { color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem' } }}
            />
            <Button
              type="button"
              variant="text"
              color="inherit"
              onClick={() => setForgotPasswordOpen(true)}
              sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem' }}
            >
              Quên mật khẩu?
            </Button>
          </Stack>

          <Button
            id="login-submit"
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={loading || success || googleLoading}
            sx={{
              fontWeight: 700,
              borderRadius: '10px',
              py: 1.3,
              fontSize: '1rem',
              '&:focus-visible': { outline: '2px solid #e50914', outlineOffset: '3px' },
              position: 'relative',
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Đăng nhập'}
          </Button>

          <Divider sx={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.8rem' }}>hoặc</Divider>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              minHeight: 44,
              opacity: googleLoading ? 0.6 : 1,
              pointerEvents: loading || success || googleLoading ? 'none' : 'auto',
              '& > div': { width: '100% !important', display: 'flex', justifyContent: 'center' },
              '& iframe': { width: '100% !important', margin: '0 auto !important' },
            }}
          >
            {googleLoading ? (
              <CircularProgress size={22} sx={{ color: '#fff' }} />
            ) : (
              <Box ref={googleButtonRef} sx={{ width: '100%' }} />
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', mt: 0.5 }}
          >
            Chưa có tài khoản?{' '}
            <Button
              id="login-register-link"
              component={RouterLink}
              to="/register"
              variant="text"
              color="primary"
              sx={{ textTransform: 'none', fontWeight: 800, px: 0.5, minWidth: 'unset' }}
            >
              Đăng ký
            </Button>
          </Typography>
        </Stack>
      </Box>
      <ForgotPasswordDialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </AuthLayout>
  );
};

export default LoginPage;
