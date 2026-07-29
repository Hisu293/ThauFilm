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
    console.groupCollapsed(`%c[NGƯỜI DÙNG][Lấy ghế] GET /api/member/booking/showtimes/${showtimeId}/seats`, 'color:#38BDF8;font-weight:bold');
    try {
      const response = await bookingApi.fetchShowtimeSeats(showtimeId);
      console.log('%c✓ API trả về (dữ liệu gốc):', 'color:#22C55E', response);
      const rawSeats = response?.data ?? response ?? [];
      console.log('→ Mảng ghế gốc (trước khi chuẩn hóa):', Array.isArray(rawSeats) ? `${rawSeats.length} ghế` : rawSeats, rawSeats);
      const normalized = bookingService.normalizeSeats(rawSeats);
      console.log('→ Sau khi chuẩn hóa:', `${normalized.length} ghế`, normalized);
      if (normalized.length > 0) {
        console.table(normalized.map((s) => ({ id: s.id, label: s.label, row: s.row, col: s.col, type: s.type, price: s.price, isSold: s.isSold })));

        // Cảnh báo nếu máy chủ trả dữ liệu mẫu (mọi ghế trùng nhãn)
        const uniqueLabels = new Set(normalized.map((s) => s.label));
        if (uniqueLabels.size === 1 && normalized.length > 1) {
          console.warn(
            `⚠ TẤT CẢ ${normalized.length} ghế đều có nhãn "${[...uniqueLabels][0]}". ` +
            'Phía giao diện đã chuẩn hóa ĐÚNG — máy chủ đang trả dữ liệu mẫu (tên hàng/số ghế giống nhau cho mọi ghế). ' +
            'Kiểm tra dữ liệu API trả về: mỗi ghế cần tên hàng (A, B, C…) và số ghế (1, 2, 3…) khác nhau.'
          );
        }
      } else {
        console.warn('⚠ Mảng ghế rỗng — máy chủ chưa cấu hình sơ đồ ghế cho suất chiếu này hoặc trả về sai cấu trúc.');
      }

      // Cấu trúc 2 chiều dùng để render sơ đồ (tham khảo nhanh trong console)
      console.log('→ Gom ghế theo hàng:', bookingService.groupSeatsByRow(normalized));
      return normalized;
    } catch (err) {
      console.error('%c✗ Lỗi lấy danh sách ghế:', 'color:#EF4444;font-weight:bold', {
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
  const create = useCallback(async (showtimeId, seatIds, channel = 'ONLINE', comboIds = []) => {
    setLoading(true);
    setError(null);
    console.groupCollapsed('%c[NGƯỜI DÙNG][Tạo đơn] POST /api/member/booking (giữ ghế)', 'color:#FBBF24;font-weight:bold');
    console.log('→ Dữ liệu gửi đi:', { showtimeId, seatIds, channel, comboIds });
    try {
      const res = await bookingApi.createBooking(showtimeId, seatIds, channel, comboIds);
      console.log('%c✓ API trả về (dữ liệu gốc):', 'color:#22C55E', res);
      const rawBooking = res?.data ?? res;
      const normalized = bookingService.normalizeBooking(rawBooking);
      console.log('→ Đơn đặt vé sau khi chuẩn hóa:', normalized);
      return normalized;
    } catch (err) {
      console.error('%c✗ Lỗi tạo đơn đặt vé:', 'color:#EF4444;font-weight:bold', {
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

  const createOnline = useCallback(async (showtimeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.createOnlineBooking(showtimeId);
      return bookingService.normalizeBooking(res?.data ?? res);
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn xem phim online.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSeats = useCallback(async (bookingId, showtimeId, seatIds, comboIds = []) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.updateBookingSeats(bookingId, showtimeId, seatIds, comboIds);
      return bookingService.normalizeBooking(response?.data ?? response);
    } catch (err) {
      setError(err.message || 'Không thể cập nhật ghế cho booking này.');
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

  const syncPayment = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.syncPayment(bookingId);
      return response?.data ?? response ?? {};
    } catch (err) {
      setError(err.message || 'Chưa xác nhận được thanh toán.');
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
    createOnline,
    updateSeats,
    getHistory,
    getDetail,
    getTickets,
    getDiscounts,
    getCombos,
    pay,
    syncPayment,
    cancel,
  };
};

export default useBooking;
