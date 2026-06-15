import axiosClient from './axiosClient';

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

  // ── Member booking endpoints ────────────────────────────────────────────────

  // Fetch seat layout for a selected showtime: GET /api/member/booking/showtimes/{showtimeId}/seats
  fetchShowtimeSeats: (showtimeId) => {
    return axiosClient.get(`/api/member/booking/showtimes/${showtimeId}/seats`);
  },

  // Create booking and temporarily hold seats: POST /api/member/booking
  createBooking: (showtimeId, seatIds) => {
    return axiosClient.post('/api/member/booking', {
      showtimeId,
      seatIds,
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

  // Confirm payment: POST /api/member/booking/{bookingId}/pay
  payBooking: (bookingId) => {
    return axiosClient.post(`/api/member/booking/${bookingId}/pay`);
  },
};

export default bookingApi;
