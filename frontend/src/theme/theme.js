import { createTheme } from '@mui/material';

export const bookingTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FBBF24', // Gold Accent
      light: '#FDE047',
      dark: '#D97706',
      contrastText: '#0F172A',
    },
    secondary: {
      main: '#DC2626', // Red
      light: '#EF4444',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0F172A', // Dark Slate Blue-Black
      paper: '#1E293B',   // Darker Slate for Cards/Surfaces
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
    action: {
      active: '#FBBF24',
      hover: 'rgba(251, 191, 36, 0.08)',
      selected: 'rgba(251, 191, 36, 0.16)',
      disabled: 'rgba(148, 163, 184, 0.3)',
      disabledBackground: 'rgba(148, 163, 184, 0.12)',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.005em',
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    body1: {
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.15)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#FDE047',
            boxShadow: '0 6px 20px rgba(251, 191, 36, 0.35)',
          },
        },
        outlinedSecondary: {
          borderColor: '#DC2626',
          color: '#F8FAFC',
          '&:hover': {
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: '#EF4444',
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E293B',
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.08)',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.95rem',
          color: '#94A3B8',
          '&.Mui-selected': {
            color: '#FBBF24',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          '&.Mui-checked': {
            color: '#FBBF24',
          },
        },
      },
    },
  },
});

export const NAV_LINKS = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Phim', to: '/movies' },
  { label: 'Rạp chiếu', to: '/cinemas' },
  { label: 'Khuyến mãi', to: '/promotions' },
];

export default bookingTheme;
