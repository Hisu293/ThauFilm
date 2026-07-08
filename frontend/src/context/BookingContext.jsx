/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'tf_booking_flow_state';

const readInitialState = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const [state, setState] = useState(readInitialState);

  const updateBookingState = useCallback((patch) => {
    setState((current) => {
      const next = { ...current, ...patch };
      const hasChanged = Object.keys(patch).some((key) => current[key] !== next[key]);
      if (!hasChanged) return current;

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearBookingState = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({});
  }, []);

  const value = useMemo(
    () => ({
      selectedMovie: state.selectedMovie || null,
      selectedShowtime: state.selectedShowtime || null,
      selectedSeats: state.selectedSeats || [],
      bookingMode: state.bookingMode || 'THEATER',
      bookingId: state.bookingId || null,
      paymentStatus: state.paymentStatus || 'IDLE',
      updateBookingState,
      clearBookingState,
    }),
    [clearBookingState, state, updateBookingState],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBookingFlow = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingFlow must be used within BookingProvider');
  return ctx;
};

export default BookingContext;
