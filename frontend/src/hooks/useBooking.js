import { useState, useCallback } from 'react';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const resolveData = (response) => {
    const raw = response?.data ?? response ?? null;
    return typeof raw === 'object' && raw !== null && Object.keys(raw).length > 0 ? raw : null;
  };

  const getSeats = useCallback(async (showtimeId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.fetchShowtimeSeats(showtimeId);
      const rawSeats = response?.data ?? response ?? [];
      return bookingService.normalizeSeats(rawSeats);
    } catch (err) {
      setError(err.message || 'Không thể tải sơ đồ ghế.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (showtimeId, seatIds) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.createBooking(showtimeId, seatIds);
      const rawBooking = resolveData(response);
      if (!rawBooking) return null;
      return bookingService.normalizeBooking(rawBooking);
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn giữ ghế.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.fetchBookingHistory();
      const rawHistory = response?.data ?? response ?? [];
      return bookingService.normalizeHistory(rawHistory);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử đặt vé.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDetail = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.fetchBookingDetail(bookingId);
      const rawBooking = resolveData(response);
      if (!rawBooking) return null;
      return bookingService.normalizeBooking(rawBooking);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin đặt vé.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTickets = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.fetchPurchasedTickets(bookingId);
      const rawTickets = response?.data ?? response ?? [];
      return Array.isArray(rawTickets) ? rawTickets : [];
    } catch (err) {
      setError(err.message || 'Không thể tải vé xem phim.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const pay = useCallback(async (bookingId, paymentMethod = 'VNPAY') => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.payBooking(bookingId, paymentMethod);
      return response?.data ?? response ?? {};
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
