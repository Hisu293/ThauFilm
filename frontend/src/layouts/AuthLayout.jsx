import {
  Box,
  Container,
  CssBaseline,
  Paper,
  ThemeProvider,
} from '@mui/material';
import { cinemaTheme as authTheme } from '../theme/cinemaTheme';

const AuthLayout = ({ children, maxFormWidth = 460 }) => (
  <ThemeProvider theme={authTheme}>
    <CssBaseline />
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.46), rgba(0, 0, 0, 0.68)),
          radial-gradient(circle at 50% 35%, rgba(229, 9, 20, 0.12) 0%, transparent 55%),
          url('/auth-background.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, sm: 4 },
        fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: maxFormWidth,
            borderRadius: { xs: '14px', sm: '20px' },
            p: { xs: 2.5, sm: 4 },
            border: { xs: 'none', sm: '1px solid rgba(255, 255, 255, 0.10)' },
            background: { xs: 'transparent', sm: 'rgba(20, 20, 20, 0.93)' },
            boxShadow: {
              xs: 'none',
              sm: '0 14px 52px rgba(0, 0, 0, 0.55), inset 0 1.5px 0 rgba(255, 255, 255, 0.07)',
            },
            backdropFilter: { xs: 'none', sm: 'blur(14px)' },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.50) !important',
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e50914 !important',
              borderWidth: '2px !important',
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#e50914 !important' },
            '& .MuiFormHelperText-root': { ml: 0.25, fontSize: '0.76rem' },
            '& .MuiCheckbox-root.Mui-checked': { color: '#e50914' },
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
              '&:active': { transform: 'scale(0.98)' },
            },
          }}
        >
          {children}
        </Paper>
      </Container>
    </Box>
  </ThemeProvider>
);

export default AuthLayout;
