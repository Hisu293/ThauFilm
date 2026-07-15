import { useCallback, useState } from 'react';
import { staffBookingApi } from '../api/staffBookingApi';
import { bookingService } from '../services/bookingService';

const unwrap = (response) => response?.data ?? response ?? null;

export const useStaffBookings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (task, fallbackMessage) => {
    setLoading(true);
    setError(null);
    try {
      return await task();
    } catch (err) {
      setError(err.message || fallbackMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError: () => setError(null),
    list: () =>
      run(async () => {
        const data = unwrap(await staffBookingApi.fetchBookings()) || [];
        return bookingService.normalizeHistory(Array.isArray(data) ? data : []);
      }, 'Không thể tải danh sách booking.'),
    detail: (bookingId) =>
      run(async () => bookingService.normalizeBooking(unwrap(await staffBookingApi.fetchBookingDetail(bookingId))), 'Không thể tải booking.'),
    payment: (bookingId) => run(async () => unwrap(await staffBookingApi.fetchPayment(bookingId)), 'Không thể tải thanh toán.'),
    purchasedMovies: (userId) => run(async () => unwrap(await staffBookingApi.fetchPurchasedMoviesByUser(userId)), 'Không thể kiểm tra phim đã mua.'),
    regrantAccess: (bookingId) => run(async () => unwrap(await staffBookingApi.regrantAccess(bookingId)), 'Không thể cấp lại quyền.'),
    cancel: (bookingId) => run(async () => unwrap(await staffBookingApi.cancel(bookingId)), 'Không thể hủy booking.'),
  };
};

export default useStaffBookings;
