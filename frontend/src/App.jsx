import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { BookingNavigationProvider } from './context/BookingNavigationContext';
import { createCinemaModeTheme } from './theme/cinemaTheme';
import { ColorModeProvider, useColorMode } from './context/ColorModeContext';
import { useMemo } from 'react';

const AppContent = () => {
  const { mode } = useColorMode();
  const theme = useMemo(() => createCinemaModeTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BookingProvider>
          <BrowserRouter>
            <BookingNavigationProvider>
              <AppRoutes />
            </BookingNavigationProvider>
          </BrowserRouter>
        </BookingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

function App() {
  return <ColorModeProvider><AppContent /></ColorModeProvider>;
}

export default App;
