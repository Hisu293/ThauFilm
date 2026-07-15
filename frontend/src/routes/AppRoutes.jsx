import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import PublicLayout from '../layouts/PublicLayout';
import StaffLayout from '../layouts/StaffLayout';
import HomePage from '../pages/HomePage';
import MoviesPage from '../pages/MoviesPage';
import CinemaPage from '../pages/CinemaPage';
import PromotionsPage from '../pages/PromotionsPage';
import ProfilePage from '../pages/ProfilePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import MovieDetailPage from '../pages/MovieDetailPage';
import DashboardPage from '../pages/DashboardPage';
import AdminPage from '../pages/AdminPage';
import InfoPage from '../pages/InfoPage';
import AdminRoute from './AdminRoute';
import NotFoundPage from '../pages/NotFoundPage';
import SharedFavoriteListPage from '../pages/SharedFavoriteListPage';
import MovieCommunityPage from '../pages/MovieCommunityPage';
import FavoriteListsPage from '../pages/FavoriteListsPage';
import CommunityConnectionsPage from '../pages/CommunityConnectionsPage';
import CommunityFeedPage from '../pages/CommunityFeedPage';
import CommunityMessagesPage from '../pages/CommunityMessagesPage';
import CinemaIntelligencePage from '../pages/CinemaIntelligencePage';
import MovieChatbotPage from '../pages/MovieChatbotPage';

// Booking Pages
import SeatSelectionPage from '../pages/SeatSelectionPage';
import BookingSummaryPage from '../pages/BookingSummaryPage';
import PaymentPage from '../pages/PaymentPage';
import BookingSuccessPage from '../pages/BookingSuccessPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import MyBookingDetailPage from '../pages/MyBookingDetailPage';
import GroupBookingPage from '../pages/GroupBookingPage';
import WatchPartyPage from '../pages/WatchPartyPage';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';
import StaffMovies from '../pages/staff/StaffMovies';
import StaffShowtimes from '../pages/staff/StaffShowtimes';
import StaffTickets from '../pages/staff/StaffTickets';
import StaffBookings from '../pages/staff/StaffBookings';
import StaffCustomers from '../pages/staff/StaffCustomers';
import StaffPromotions from '../pages/staff/StaffPromotions';
import StaffReports from '../pages/staff/StaffReports';
import StaffAttendance from '../pages/staff/StaffAttendance';
import StaffAttendanceDisplay from '../pages/staff/StaffAttendanceDisplay';
import StaffRefunds from '../pages/staff/StaffRefunds';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public content pages — shared navbar + footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/cinemas" element={<CinemaPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/movies/:id/community" element={<MovieCommunityPage />} />
        <Route path="/lists/:listId" element={<SharedFavoriteListPage />} />
        <Route path="/favorite-lists" element={<FavoriteListsPage />} />
        <Route path="/community/connections" element={<CommunityConnectionsPage />} />
        <Route path="/community/feed" element={<CommunityFeedPage />} />
        <Route path="/community/messages" element={<CommunityMessagesPage />} />
        <Route path="/intelligence" element={<CinemaIntelligencePage />} />
        <Route path="/movie-chatbot" element={<MovieChatbotPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
         
        <Route path="/booking/seats/:showtimeId" element={<SeatSelectionPage />} />
        <Route path="/booking/showtime/:showtimeId" element={<SeatSelectionPage />} />
        <Route path="/booking/summary" element={<BookingSummaryPage />} />
        <Route path="/booking/payment" element={<PaymentPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking/success" element={<BookingSuccessPage />} />
        <Route path="/booking/group/:groupId" element={<GroupBookingPage />} />
        <Route path="/watch-party/:roomId" element={<WatchPartyPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/my-bookings/:bookingId" element={<MyBookingDetailPage />} />

        {/* Trang nội dung tĩnh liên kết từ footer */}
        <Route path="/faq" element={<InfoPage contentKey="faq" />} />
        <Route path="/terms" element={<InfoPage contentKey="terms" />} />
        <Route path="/privacy" element={<InfoPage contentKey="privacy" />} />
        <Route path="/refund" element={<InfoPage contentKey="refund" />} />
        <Route path="/contact" element={<InfoPage contentKey="contact" />} />
        <Route path="/cookie" element={<InfoPage contentKey="cookie" />} />

      </Route>

      {/* Auth + admin — no public navbar */}
      <Route element={<MainLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Staff Module Routes */}
      <Route path="/staff" element={<StaffLayout />}>
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="movies" element={<StaffMovies />} />
        <Route path="showtimes-manage" element={<StaffShowtimes />} />
        <Route path="tickets" element={<StaffTickets />} />
        <Route path="bookings" element={<StaffBookings />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="promotions" element={<StaffPromotions />} />
        <Route path="reports" element={<StaffReports />} />
        <Route path="attendance" element={<StaffAttendance />} />
        <Route path="attendance-display" element={<StaffAttendanceDisplay />} />
        <Route path="refunds" element={<StaffRefunds />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
