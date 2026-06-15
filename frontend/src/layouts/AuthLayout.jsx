import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  Box,
  Container,
  CssBaseline,
  Paper,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';

/* ─── Shared dark cinema theme ─────────────────────────────────────────── */
export const authTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e50914' },
    background: { default: '#090909', paper: '#171717' },
    text: { primary: '#f7f7f7', secondary: 'rgba(255,255,255,0.75)' },
  },
  typography: {
    fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(255,255,255,0.04)', color: '#fff' },
        notchedOutline: { borderColor: 'rgba(255,255,255,0.22)' },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: 'rgba(255,255,255,0.65)' } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 5,
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
      },
    },
  },
});

/* ─── Default poster content ───────────────────────────────────────────── */
const DEFAULT_POSTER = {
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

/* ─── AuthLayout ────────────────────────────────────────────────────────── */
const AuthLayout = ({ children, poster = {}, maxFormWidth = 460 }) => {
  const p = { ...DEFAULT_POSTER, ...poster };

  return (
    <ThemeProvider theme={authTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: `
            radial-gradient(circle at 8%  8%,  rgba(229, 9, 20, 0.20) 0%, transparent 42%),
            radial-gradient(circle at 82% 18%, rgba(99, 102, 241, 0.10) 0%, transparent 45%),
            #090909
          `,
          display: 'flex',
          alignItems: 'center',
          py: { xs: 0, sm: 4 },
          fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            width: '100%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              borderRadius: { xs: 0, sm: '22px' },
              overflow: 'hidden',
              border: { xs: 'none', sm: '1px solid rgba(255, 255, 255, 0.08)' },
              background: '#111111',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.08fr 1fr' },
              minHeight: { xs: 'auto', sm: 'min(760px, calc(100vh - 96px))' },
              boxShadow: {
                xs: 'none',
                sm: '0 32px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)',
              },
            }}
          >
            {/* ══ LEFT — Cinema poster ══ */}
            <Box
              role="presentation"
              aria-hidden="true"
              sx={{
                position: 'relative',
                backgroundImage: `
                  linear-gradient(135deg, rgba(229, 9, 20, 0.30) 0%, transparent 60%),
                  url('/cinema-bg.png')
                `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                overflow: 'hidden',
                minHeight: { xs: 210, sm: 280, md: 'unset' },
              }}
            >
              {/* Radial vignette + directional gradient overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `
                    linear-gradient(180deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.75) 100%),
                    radial-gradient(circle at 22% 22%, rgba(255, 255, 255, 0.05) 0%, transparent 55%),
                    linear-gradient(90deg, rgba(0, 0, 0, 0) 60%, rgba(17, 17, 17, 0.55) 100%)
                  `,
                  transition: 'opacity 0.35s',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              />
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  height: '100%',
                  p: { xs: 2.25, sm: 3.5, md: 5.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: 0.5,
                }}
              >
                {/* Brand overline */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 32, width: 'auto', objectFit: 'contain' }} />
                  <Typography
                    variant="h6"
                    sx={{ color: '#fff', fontWeight: 800, letterSpacing: '0.01em' }}
                  >
                    {p.tagline}
                  </Typography>
                </Stack>

                {/* Main heading */}
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.1,
                    mb: 2,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
                  }}
                >
                  {p.heading}
                </Typography>

                {/* Body copy */}
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '1.04rem',
                    maxWidth: 400,
                    lineHeight: 1.75,
                  }}
                >
                  {p.body}
                </Typography>

                {/* Feature list */}
                {p.features?.length > 0 && (
                  <Stack spacing={1.5} sx={{ mt: 3.5 }}>
                    {p.features.map((feat) => (
                      <Stack key={feat} direction="row" alignItems="center" spacing={1}>
                        <CheckCircleRoundedIcon sx={{ color: '#e50914', fontSize: 20, flexShrink: 0 }} />
                        <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.93rem' }}>
                          {feat}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}

                {/* Pills */}
                {p.pills?.length > 0 && (
                  <Stack direction="row" sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}>
                    {p.pills.map((pill) => (
                      <Box
                        key={pill}
                        sx={{
                          px: 1.75,
                          py: 0.85,
                          borderRadius: '999px',
                          background: 'rgba(255, 255, 255, 0.14)',
                          border: '1px solid rgba(255, 255, 255, 0.28)',
                          color: 'rgba(255, 255, 255, 0.92)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          letterSpacing: '0.045em',
                          whiteSpace: 'nowrap',
                          backdropFilter: 'blur(8px)',
                          cursor: 'default',
                          userSelect: 'none',
                          transition: 'background 0.22s, border-color 0.22s, transform 0.18s',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.22)',
                            borderColor: 'rgba(255, 255, 255, 0.50)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {pill}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

            {/* ══ RIGHT — Form pane ══ */}
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'center',
                p: { xs: 1.75, sm: 3, md: 5.25 },
                background: `
                  radial-gradient(circle at 30% 10%, rgba(229, 9, 20, 0.11) 0%, transparent 50%),
                  #101010
                `,
                overflowY: 'auto',
                scrollBehavior: 'smooth',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: '100%',
                  maxWidth: { xs: '100%', sm: 500 },
                  borderRadius: { xs: '14px', sm: '20px' },
                  p: { xs: 2.5, sm: 4 },
                  border: { xs: 'none', sm: '1px solid rgba(255, 255, 255, 0.10)' },
                  background: { xs: 'transparent', sm: 'rgba(20, 20, 20, 0.93)' },
                  boxShadow: {
                    xs: 'none',
                    sm: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1.5px 0 rgba(255, 255, 255, 0.06)',
                  },
                  backdropFilter: { xs: 'none', sm: 'blur(14px)' },
                  transition: 'box-shadow 0.3s ease',
                  '&:hover': {
                    boxShadow: {
                      xs: 'none',
                      sm: '0 14px 52px rgba(0, 0, 0, 0.55), inset 0 1.5px 0 rgba(255, 255, 255, 0.07)',
                    },
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.50) !important',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e50914 !important',
                    borderWidth: '2px !important',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#e50914 !important',
                  },
                  '& .MuiFormHelperText-root': {
                    ml: 0.25,
                    fontSize: '0.76rem',
                  },
                  '& .MuiCheckbox-root.Mui-checked': {
                    color: '#e50914',
                  },
                  '& .MuiDivider-root::before, & .MuiDivider-root::after': {
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                  },
                  '& .MuiButton-containedPrimary': {
                    boxShadow: '0 4px 24px rgba(229, 9, 20, 0.32)',
                    transition: 'box-shadow 0.25s, transform 0.18s',
                    '&:hover': {
                      boxShadow: '0 6px 32px rgba(229, 9, 20, 0.52)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                      boxShadow: '0 2px 12px rgba(229, 9, 20, 0.28)',
                    },
                  },
                  '& .MuiButton-outlined': {
                    transition: 'background 0.22s, border-color 0.22s, transform 0.18s',
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  },
                }}
              >
                <Box sx={{ width: '100%', maxWidth: maxFormWidth }}>
                  {children}
                </Box>
              </Paper>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AuthLayout;
