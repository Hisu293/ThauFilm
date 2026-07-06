import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { SpeedInsights } from '@vercel/speed-insights/react';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { BookingNavigationProvider } from './context/BookingNavigationContext';
import cinemaTheme from './theme/cinemaTheme';

function App() {
  return (
    <ThemeProvider theme={cinemaTheme}>
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
      <SpeedInsights />
    </ThemeProvider>
  );
}

export default App;
