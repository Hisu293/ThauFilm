import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import GoogleIcon from '@mui/icons-material/Google';
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
    { label: 'Very Weak',   color: '#e50914' },
    { label: 'Weak',        color: '#ff6b35' },
    { label: 'Fair',        color: '#ffc107' },
    { label: 'Strong',      color: '#4caf50' },
    { label: 'Very Strong', color: '#00e676' },
  ];
  return { score, ...map[score] };
}

/* ─── Left-panel copy (register-specific) ───────────────────────── */
const REGISTER_POSTER = {
  tagline: 'ThauFilm',
  heading: 'Your front-row seat\u00a0starts here.',
  body: 'Book your favourite movies anytime, anywhere. Get exclusive early access, member discounts, and real-time seat selection.',
  features: [
    'Instant e-ticket delivery',
    'Real-time seat map',
    'Member-only promotions',
    'Multi-cinema support',
  ],
  pills: ['Premium Experience', 'Secure Checkout', 'Real-time Seats'],
};

/* ─── Component ─────────────────────────────────────────────────── */
const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName:        '',
    email:           '',
    phone:           '',
    password:        '',
    confirmPassword: '',
  });
  const [showPw,        setShowPw]        = useState(false);
  const [showCpw,       setShowCpw]       = useState(false);
  const [acceptTerms,   setAcceptTerms]   = useState(false);
  const [subscribePromo, setSubscribePromo] = useState(false);
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
      e.fullName = 'Full name is required.';
  // username not required by backend, removed from form
    if (!form.email.trim())
      e.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email.trim()))
      e.email = 'Enter a valid email address.';
    if (!form.phone.trim())
      e.phone = 'Phone number is required.';
    else if (!PHONE_RE.test(form.phone.trim()))
      e.phone = 'Enter a valid phone number (9–15 digits).';
    if (!form.password)
      e.password = 'Password is required.';
    else if (form.password.length < 6)
      e.password = 'Password must be at least 6 characters.';
    if (!form.confirmPassword)
      e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match.';
    if (!acceptTerms)
      e.terms = 'You must accept the Terms & Conditions.';
    return e;
  }, [submitted, form, acceptTerms]);

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
      !acceptTerms;

    if (hasErrors) return;

    setLoading(true);
    try {
      const resp = await authService.register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
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
    <AuthLayout poster={REGISTER_POSTER} maxFormWidth={460}>

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
          Create Account
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.70)' }}>
          Join us and start booking movie tickets today.
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
          Account created! Redirecting to login…
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
          Please fix the errors below before continuing.
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
            label="Full Name"
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
            label="Email Address"
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
            label="Phone Number"
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

          {/* Password + strength bar */}
          <Box>
            <TextField
              label="Password"
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
                      aria-label={showPw ? 'Hide password' : 'Show password'}
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
            label="Confirm Password"
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
                ? 'Passwords do not match.'
                : ' '
            }
            autoComplete="new-password"
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showCpw ? 'Hide confirm password' : 'Show confirm password'}
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

          {/* Checkboxes */}
          <Stack spacing={0.5} sx={{ mt: -0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="reg-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: errors.terms ? '#ff8a80' : 'rgba(255,255,255,0.82)' }}
                >
                  I accept the{' '}
                  <Button
                    variant="text"
                    color="primary"
                    sx={{ textTransform: 'none', p: 0, minWidth: 'unset', fontWeight: 700, fontSize: 'inherit' }}
                  >
                    Terms &amp; Conditions
                  </Button>
                  {' '}and{' '}
                  <Button
                    variant="text"
                    color="primary"
                    sx={{ textTransform: 'none', p: 0, minWidth: 'unset', fontWeight: 700, fontSize: 'inherit' }}
                  >
                    Privacy Policy
                  </Button>
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  id="reg-promo"
                  checked={subscribePromo}
                  onChange={(e) => setSubscribePromo(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  Subscribe to exclusive promotions &amp; offers
                </Typography>
              }
            />
          </Stack>

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
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
          </Button>

          <Divider sx={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.8rem' }}>or</Divider>

          {/* Google */}
          <Button
            id="reg-google"
            type="button"
            variant="outlined"
            color="inherit"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#fff',
              borderRadius: '10px',
              py: 1.2,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.65)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            Continue with Google
          </Button>

          {/* Login link */}
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', mt: 0.5 }}
          >
            Already have an account?{' '}
            <Button
              id="reg-login-link"
              component={RouterLink}
              to="/login"
              variant="text"
              color="primary"
              sx={{ textTransform: 'none', fontWeight: 800, px: 0.5, minWidth: 'unset' }}
            >
              Sign in
            </Button>
          </Typography>

        </Stack>
      </Box>
    </AuthLayout>
  );
};

export default RegisterPage;
