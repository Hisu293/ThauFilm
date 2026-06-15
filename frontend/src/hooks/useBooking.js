import { useState, useCallback } from 'react';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear errors manually
  const clearError = useCallback(() => setError(null), []);

  // Fetch showtimes seat layout: GET /api/member/booking/showtimes/{showtimeId}/seats
  const getSeats = useCallback(async (showtimeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchShowtimeSeats(showtimeId);
      // Backend shape: { success, message, data: [...] }
      const rawSeats = res?.data ?? res ?? [];
      return bookingService.normalizeSeats(rawSeats);
    } catch (err) {
      setError(err.message || 'Không thể tải sơ đồ ghế.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create booking (hold seats): POST /api/member/booking
  const create = useCallback(async (showtimeId, seatIds) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.createBooking(showtimeId, seatIds);
      const rawBooking = res?.data ?? res;
      return bookingService.normalizeBooking(rawBooking);
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn giữ ghế.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get booking history: GET /api/member/booking
  const getHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchBookingHistory();
      const rawHistory = res?.data ?? res ?? [];
      return bookingService.normalizeHistory(rawHistory);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử đặt vé.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single booking detail: GET /api/member/booking/{bookingId}
  const getDetail = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchBookingDetail(bookingId);
      const rawBooking = res?.data ?? res;
      return bookingService.normalizeBooking(rawBooking);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin đặt vé.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tickets for a booking: GET /api/member/booking/{bookingId}/tickets
  const getTickets = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchPurchasedTickets(bookingId);
      return res?.data ?? res ?? [];
    } catch (err) {
      setError(err.message || 'Không thể tải vé xem phim.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Pay and confirm booking: POST /api/member/booking/{bookingId}/pay
  const pay = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.payBooking(bookingId);
      return res?.data ?? res;
    } catch (err) {
      setError(err.message || 'Thanh toán thất bại.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setError,
    clearError,
    getSeats,
    create,
    getHistory,
    getDetail,
    getTickets,
    pay,
  };
};

export default useBooking;
