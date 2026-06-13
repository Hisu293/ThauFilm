import { createTheme } from '@mui/material';

export const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e50914' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#6366f1' },
    background: { default: '#08080c', paper: '#121218' },
    text: { primary: '#fafafa', secondary: 'rgba(255,255,255,0.58)' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiTableCell: {
      styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.06)' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#14141c',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
  },
});

export const SIDEBAR_WIDTH = 300;
