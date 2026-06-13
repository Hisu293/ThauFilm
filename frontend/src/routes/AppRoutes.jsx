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
import AdminRoute from './AdminRoute';
import NotFoundPage from '../pages/NotFoundPage';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';
import TicketCheckIn from '../pages/staff/TicketCheckIn';
import ShowtimesList from '../pages/staff/ShowtimesList';
import CustomerSupport from '../pages/staff/CustomerSupport';

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
        <Route path="/dashboard" element={<DashboardPage />} />
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
        <Route path="check-in" element={<TicketCheckIn />} />
        <Route path="showtimes" element={<ShowtimesList />} />
        <Route path="support" element={<CustomerSupport />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
