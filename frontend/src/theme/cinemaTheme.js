import { createTheme, alpha } from '@mui/material/styles';
import { t } from '../i18n/labels';

const fontFamily = '"Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

export const cinemaTokens = {
  radius: {
    sm: 10,
    md: 12,
    lg: 16,
    xl: 20,
  },
  palette: {
    ink: '#0B1020',
    surface: '#111827',
    surfaceSoft: '#1E293B',
    gold: '#FBBF24',
    goldSoft: '#FDE68A',
    red: '#E50914',
    redSoft: '#EF4444',
    text: '#F8FAFC',
    muted: '#94A3B8',
    line: 'rgba(148, 163, 184, 0.14)',
  },
  shadow: {
    card: '0 18px 45px rgba(0, 0, 0, 0.28)',
    focus: '0 0 0 3px rgba(251, 191, 36, 0.22)',
    glow: '0 12px 28px rgba(251, 191, 36, 0.22)',
  },
};

export const cinemaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: cinemaTokens.palette.gold,
      light: cinemaTokens.palette.goldSoft,
      dark: '#D97706',
      contrastText: cinemaTokens.palette.ink,
    },
    secondary: {
      main: cinemaTokens.palette.red,
      light: cinemaTokens.palette.redSoft,
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#38BDF8' },
    background: {
      default: cinemaTokens.palette.ink,
      paper: cinemaTokens.palette.surfaceSoft,
    },
    text: {
      primary: cinemaTokens.palette.text,
      secondary: cinemaTokens.palette.muted,
    },
    divider: cinemaTokens.palette.line,
    action: {
      active: cinemaTokens.palette.gold,
      hover: alpha(cinemaTokens.palette.gold, 0.08),
      selected: alpha(cinemaTokens.palette.gold, 0.16),
      disabled: alpha(cinemaTokens.palette.muted, 0.36),
      disabledBackground: alpha(cinemaTokens.palette.muted, 0.12),
    },
  },
  shape: {
    borderRadius: cinemaTokens.radius.md,
  },
  typography: {
    fontFamily,
    h1: {
      fontWeight: 900,
      letterSpacing: 0,
      fontSize: 'clamp(2.25rem, 5vw, 4.5rem)',
      lineHeight: 1.05,
    },
    h2: {
      fontWeight: 900,
      letterSpacing: 0,
      fontSize: 'clamp(2rem, 4vw, 3.25rem)',
      lineHeight: 1.08,
    },
    h3: {
      fontWeight: 900,
      letterSpacing: 0,
      fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
      lineHeight: 1.14,
    },
    h4: {
      fontWeight: 800,
      letterSpacing: 0,
      fontSize: 'clamp(1.45rem, 2.5vw, 2rem)',
      lineHeight: 1.2,
    },
    h5: { fontWeight: 800, lineHeight: 1.25 },
    h6: { fontWeight: 700, lineHeight: 1.3 },
    subtitle1: { fontWeight: 600, lineHeight: 1.55 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    caption: { fontSize: '0.76rem', lineHeight: 1.45 },
    button: {
      fontWeight: 800,
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          minHeight: '100%',
          scrollBehavior: 'smooth',
        },
        body: {
          minHeight: '100%',
          margin: 0,
          fontFamily,
          backgroundColor: cinemaTokens.palette.ink,
          color: cinemaTokens.palette.text,
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '#root': {
          minHeight: '100vh',
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
        'img, video, canvas, svg': {
          maxWidth: '100%',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
          padding: '10px 20px',
          transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:focus-visible': {
            boxShadow: cinemaTokens.shadow.focus,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${cinemaTokens.palette.gold} 0%, #D97706 100%)`,
          color: cinemaTokens.palette.ink,
          '&:hover': {
            background: `linear-gradient(135deg, ${cinemaTokens.palette.goldSoft} 0%, ${cinemaTokens.palette.gold} 100%)`,
            boxShadow: cinemaTokens.shadow.glow,
          },
          '&.Mui-disabled': {
            background: alpha(cinemaTokens.palette.muted, 0.18),
            color: alpha(cinemaTokens.palette.muted, 0.5),
            boxShadow: 'none',
            transform: 'none',
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${cinemaTokens.palette.redSoft} 0%, ${cinemaTokens.palette.red} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #F87171 0%, ${cinemaTokens.palette.red} 100%)`,
            boxShadow: '0 12px 28px rgba(229, 9, 20, 0.26)',
          },
        },
        outlined: {
          borderColor: alpha(cinemaTokens.palette.text, 0.2),
          '&:hover': {
            borderColor: cinemaTokens.palette.gold,
            backgroundColor: alpha(cinemaTokens.palette.gold, 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: cinemaTokens.radius.lg,
          border: `1px solid ${cinemaTokens.palette.line}`,
          backgroundColor: cinemaTokens.palette.surfaceSoft,
          backgroundImage: 'none',
          boxShadow: cinemaTokens.shadow.card,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: cinemaTokens.palette.line,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha('#FFFFFF', 0.035),
          transition: 'box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(cinemaTokens.palette.gold, 0.45),
          },
          '&.Mui-focused': {
            boxShadow: cinemaTokens.shadow.focus,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: cinemaTokens.palette.gold,
          },
        },
        notchedOutline: {
          borderColor: alpha(cinemaTokens.palette.muted, 0.18),
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: cinemaTokens.palette.muted,
          '&.Mui-focused': {
            color: cinemaTokens.palette.gold,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 99,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          fontWeight: 800,
          textTransform: 'none',
          color: cinemaTokens.palette.muted,
          '&.Mui-selected': {
            color: cinemaTokens.palette.gold,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: cinemaTokens.radius.lg,
          border: `1px solid ${cinemaTokens.palette.line}`,
          backgroundColor: cinemaTokens.palette.surfaceSoft,
          backgroundImage: 'none',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.55)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: cinemaTokens.palette.line,
        },
        head: {
          color: cinemaTokens.palette.muted,
          fontWeight: 800,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: cinemaTokens.palette.muted,
          '&.Mui-checked': {
            color: cinemaTokens.palette.gold,
          },
        },
      },
    },
  },
});

export const createCinemaModeTheme = (mode = 'dark', primaryMain = cinemaTokens.palette.gold) => {
  const dark = mode === 'dark';
  const goldPrimary = primaryMain.toLowerCase() === cinemaTokens.palette.gold.toLowerCase();
  const background = dark
    ? { default: cinemaTokens.palette.ink, paper: cinemaTokens.palette.surfaceSoft }
    : { default: '#F4F6FA', paper: '#FFFFFF' };
  const text = dark
    ? { primary: cinemaTokens.palette.text, secondary: cinemaTokens.palette.muted }
    : { primary: '#172033', secondary: '#667085' };
  const divider = dark ? cinemaTokens.palette.line : 'rgba(15, 23, 42, 0.10)';

  return createTheme(cinemaTheme, {
    palette: {
      mode,
      primary: { main: primaryMain, contrastText: goldPrimary ? '#0B1020' : '#FFFFFF' },
      background,
      text,
      divider,
      action: {
        hover: dark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.055)',
        selected: dark ? 'rgba(251,191,36,0.16)' : 'rgba(229,9,20,0.09)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: background.default, color: text.primary },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: background.paper,
            borderColor: divider,
            boxShadow: dark ? cinemaTokens.shadow.card : '0 12px 34px rgba(15, 23, 42, 0.07)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            background: goldPrimary
              ? `linear-gradient(135deg, ${cinemaTokens.palette.gold} 0%, #D97706 100%)`
              : `linear-gradient(135deg, #EF4444 0%, ${primaryMain} 100%)`,
            color: goldPrimary ? '#0B1020' : '#FFFFFF',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: background.paper, borderColor: divider },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { backgroundColor: dark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.025)' },
          notchedOutline: { borderColor: dark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.16)' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: divider },
          head: { color: text.secondary },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { color: text.secondary },
        },
      },
    },
  });
};

export const NAV_LINKS = [
  { label: t('common', 'home'), to: '/' },
  { label: 'Phim', to: '/movies' },
  { label: 'Rạp chiếu', to: '/cinemas' },
  { label: 'Khuyến mãi', to: '/promotions' },
  { label: 'Bảng tin cộng đồng', to: '/community/feed' },
  { label: 'Tìm bạn xem phim', to: '/dating' },
];

export default cinemaTheme;
