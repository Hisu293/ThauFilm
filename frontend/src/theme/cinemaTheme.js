import { createTheme } from '@mui/material';

export const cinemaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e50914' },
    background: { default: '#0b0b0b', paper: '#141414' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.72)' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Be Vietnam Pro", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 800, letterSpacing: 0.2 },
    h5: { fontWeight: 700 },
  },
});

export const NAV_LINKS = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Phim', to: '/movies' },
  { label: 'Rạp chiếu', to: '/cinemas' },
  { label: 'Khuyến mãi', to: '/promotions' },
];

export default cinemaTheme;
