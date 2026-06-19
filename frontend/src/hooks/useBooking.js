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
    console.groupCollapsed(`%c[USER][getSeats] GET /api/member/booking/showtimes/${showtimeId}/seats`, 'color:#38BDF8;font-weight:bold');
    try {
      const response = await bookingApi.fetchShowtimeSeats(showtimeId);
      console.log('%c✓ API trả về (raw envelope):', 'color:#22C55E', response);
      const rawSeats = response?.data ?? response ?? [];
      console.log('→ rawSeats (mảng ghế trước normalize):', Array.isArray(rawSeats) ? `${rawSeats.length} ghế` : rawSeats, rawSeats);
      const normalized = bookingService.normalizeSeats(rawSeats);
      console.log('→ Sau normalize:', `${normalized.length} ghế`, normalized);
      if (normalized.length > 0) {
        console.table(normalized.map((s) => ({ id: s.id, label: s.label, row: s.row, col: s.col, type: s.type, price: s.price, isSold: s.isSold })));

        // Cảnh báo nếu backend trả dữ liệu mẫu/placeholder (mọi ghế trùng label)
        const uniqueLabels = new Set(normalized.map((s) => s.label));
        if (uniqueLabels.size === 1 && normalized.length > 1) {
          console.warn(
            `⚠ TẤT CẢ ${normalized.length} ghế đều có label "${[...uniqueLabels][0]}". ` +
            'Frontend normalize ĐÚNG — đây là do BACKEND trả dữ liệu mẫu (rowName/seatNumber giống nhau cho mọi ghế). ' +
            'Kiểm tra response API: mỗi ghế cần rowName (A,B,C…) + seatNumber (1,2,3…) khác nhau.'
          );
        }
      } else {
        console.warn('⚠ Mảng ghế rỗng — backend chưa cấu hình sơ đồ ghế cho showtime này, hoặc trả về sai shape.');
      }

      // Cấu trúc 2 chiều dùng để render sơ đồ (tham khảo nhanh trong console)
      console.log('→ Gom theo hàng (groupSeatsByRow):', bookingService.groupSeatsByRow(normalized));
      return normalized;
    } catch (err) {
      console.error('%c✗ getSeats LỖI:', 'color:#EF4444;font-weight:bold', {
        message: err.message,
        status: err.status,
        details: err.details,
        raw: err.raw,
      });
      setError(err.message || 'Không thể tải sơ đồ ghế.');
      throw err;
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  }, []);

  // Create booking (hold seats): POST /api/member/booking
  const create = useCallback(async (showtimeId, seatIds, channel = 'ONLINE') => {
    setLoading(true);
    setError(null);
    console.groupCollapsed('%c[USER][create] POST /api/member/booking (giữ ghế)', 'color:#FBBF24;font-weight:bold');
    console.log('→ Payload:', { showtimeId, seatIds, channel });
    try {
      const res = await bookingApi.createBooking(showtimeId, seatIds, channel);
      console.log('%c✓ API trả về (raw envelope):', 'color:#22C55E', res);
      const rawBooking = res?.data ?? res;
      const normalized = bookingService.normalizeBooking(rawBooking);
      console.log('→ Booking sau normalize:', normalized);
      return normalized;
    } catch (err) {
      console.error('%c✗ create LỖI:', 'color:#EF4444;font-weight:bold', {
        message: err.message,
        status: err.status,
        details: err.details,
        raw: err.raw,
      });
      setError(err.message || 'Không thể tạo đơn giữ ghế.');
      throw err;
    } finally {
      console.groupEnd();
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

  const getDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchActiveDiscounts();
      const rawDiscounts = res?.data ?? res ?? [];
      return bookingService.normalizeDiscounts(rawDiscounts);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khuyến mãi.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCombos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.fetchActiveCombos();
      const rawCombos = res?.data ?? res ?? [];
      return bookingService.normalizeCombos(rawCombos);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách combo.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Pay and confirm booking: POST /api/member/booking/{bookingId}/pay
  const pay = useCallback(async (bookingId, paymentMethod = 'VNPAY', discountCode = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.payBooking(bookingId, paymentMethod, discountCode);
      return response?.data ?? response ?? {};
    } catch (err) {
      setError(err.message || 'Thanh toán thất bại.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.cancelBooking(bookingId);
      const rawBooking = resolveData(response);
      return rawBooking ? bookingService.normalizeBooking(rawBooking) : null;
    } catch (err) {
      setError(err.message || 'Không thể hủy đơn đặt vé.');
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
    getDiscounts,
    getCombos,
    pay,
    cancel,
  };
};

export default useBooking;
