import axiosClient from './axiosClient';

const DEFAULT_BOOKING_CHANNEL = 'ONLINE';

export const bookingApi = {
  // ── Quick Booking widget endpoints ─────────────────────────────────────────

  // List now-showing movies for Quick Booking selector: GET /api/movies/now-showing
  fetchNowShowingMovies: () => {
    return axiosClient.get('/api/movies/now-showing');
  },

  // Get theaters showing a specific movie: GET /api/theaters/movie/{movieId}
  fetchTheatersByMovie: (movieId) => {
    return axiosClient.get(`/api/theaters/movie/${movieId}`);
  },

  // Get showtimes by movie ID: GET /api/showtimes/movie/{movieId}
  fetchShowtimesByMovie: (movieId) => {
    return axiosClient.get(`/api/showtimes/movie/${movieId}`);
  },

  // Get showtimes with optional filters: GET /api/showtimes
  fetchShowtimes: (params = {}) => {
    return axiosClient.get('/api/showtimes', { params });
  },

  // ── Member booking endpoints ────────────────────────────────────────────────

  // Fetch seat layout for a selected showtime: GET /api/member/booking/showtimes/{showtimeId}/seats
  fetchShowtimeSeats: (showtimeId) => {
    return axiosClient.get(`/api/member/booking/showtimes/${showtimeId}/seats`);
  },

  suggestGroupSeats: (showtimeId, count) => {
    return axiosClient.get(`/api/member/booking/showtimes/${showtimeId}/seat-suggestions`, {
      params: { count },
    });
  },

  joinTicketQueue: (showtimeId) => {
    return axiosClient.post(`/api/member/booking/showtimes/${showtimeId}/queue/join`);
  },

  fetchTicketQueueStatus: (showtimeId) => {
    return axiosClient.get(`/api/member/booking/showtimes/${showtimeId}/queue/status`);
  },

  heartbeatTicketQueue: (showtimeId) => {
    return axiosClient.post(`/api/member/booking/showtimes/${showtimeId}/queue/heartbeat`);
  },

  leaveTicketQueue: (showtimeId) => {
    return axiosClient.post(`/api/member/booking/showtimes/${showtimeId}/queue/leave`);
  },

  // Create booking and temporarily hold seats: POST /api/member/booking
  createBooking: (showtimeId, seatIds, channel = DEFAULT_BOOKING_CHANNEL, comboIds = []) => {
    return axiosClient.post('/api/member/booking', {
      showtimeId,
      seatIds,
      channel,
      comboIds,
    });
  },

  createOnlineBooking: (showtimeId) => {
    return axiosClient.post('/api/member/booking/online', {
      showtimeId,
    });
  },

  // Change seats while preserving the existing booking hold.
  updateBookingSeats: (bookingId, showtimeId, seatIds, comboIds = []) => {
    return axiosClient.put(`/api/member/booking/${bookingId}/seats`, {
      showtimeId,
      seatIds,
      comboIds,
    });
  },

  // Display booking history: GET /api/member/booking
  fetchBookingHistory: () => {
    return axiosClient.get('/api/member/booking');
  },

  // Display booking details: GET /api/member/booking/{bookingId}
  fetchBookingDetail: (bookingId) => {
    return axiosClient.get(`/api/member/booking/${bookingId}`);
  },

  // Display purchased tickets: GET /api/member/booking/{bookingId}/tickets
  fetchPurchasedTickets: (bookingId) => {
    return axiosClient.get(`/api/member/booking/${bookingId}/tickets`);
  },

  // List active discounts for the current member: GET /api/member/booking/discounts
  fetchActiveDiscounts: () => {
    return axiosClient.get('/api/member/booking/discounts');
  },

  // List active combos for the current member: GET /api/member/booking/combos
  fetchActiveCombos: () => {
    return axiosClient.get('/api/member/booking/combos');
  },

  // Confirm payment: POST /api/member/booking/{bookingId}/pay
  payBooking: (bookingId, paymentMethod = 'VNPAY', discountCode = '') => {
    const payload = { paymentMethod };
    if (discountCode) payload.discountCode = discountCode;
    return axiosClient.post(`/api/member/booking/${bookingId}/pay`, payload);
  },

  syncPayment: (bookingId) => {
    return axiosClient.post(`/api/member/booking/${bookingId}/sync-payment`);
  },

  // Cancel a held booking and release seats: POST /api/member/booking/{bookingId}/cancel
  cancelBooking: (bookingId) => {
    return axiosClient.post(`/api/member/booking/${bookingId}/cancel`);
  },

  fetchGroupBooking: (groupId) => {
    return axiosClient.get(`/api/member/group-bookings/${groupId}`);
  },

  selectGroupSeats: (groupId, seatIds) => {
    return axiosClient.post(`/api/member/group-bookings/${groupId}/seats`, { seatIds });
  },

  payGroupBooking: (groupId, paymentMethod = 'VNPAY') => {
    return axiosClient.post(`/api/member/group-bookings/${groupId}/pay`, { paymentMethod });
  },
};

export default bookingApi;
