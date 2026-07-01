import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/common/LoadingOverlay';

const BookingNavigationContext = createContext(null);

export const BookingNavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    };
  }, []);

  const navigateWithLoading = useCallback((to, options) => {
    if (loading) return;
    setLoading(true);
    timerRef.current = window.setTimeout(() => {
      navigate(to, options);
      finishTimerRef.current = window.setTimeout(() => setLoading(false), 150);
    }, 100);
  }, [loading, navigate]);

  return (
    <BookingNavigationContext.Provider value={navigateWithLoading}>
      {children}
      <LoadingOverlay open={loading} message="Đang chuyển sang bước tiếp theo..." blur fullScreen />
    </BookingNavigationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBookingNavigate = () => {
  const context = useContext(BookingNavigationContext);
  if (!context) throw new Error('useBookingNavigate must be used inside BookingNavigationProvider');
  return context;
};
