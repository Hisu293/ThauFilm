import axiosClient from './axiosClient';

export const staffBookingApi = {
  fetchBookings: () => axiosClient.get('/api/staff/bookings'),
  fetchBookingDetail: (bookingId) => axiosClient.get(`/api/staff/bookings/${bookingId}`),
  fetchPayment: (bookingId) => axiosClient.get(`/api/staff/bookings/${bookingId}/payment`),
  fetchPurchasedMoviesByUser: (userId) => axiosClient.get(`/api/staff/bookings/users/${userId}/purchased-movies`),
  regrantAccess: (bookingId) => axiosClient.post(`/api/staff/bookings/${bookingId}/regrant-access`),
  refund: (bookingId) => axiosClient.post(`/api/staff/bookings/${bookingId}/refund`),
  cancel: (bookingId) => axiosClient.post(`/api/staff/bookings/${bookingId}/cancel`),
};

export default staffBookingApi;
