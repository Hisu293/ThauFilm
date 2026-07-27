import { ADMIN_VIEWS } from './adminNav';
import DashboardSection from './sections/DashboardSection';
import { MoviesSection, GenresSection, ActorsSection, TrailersSection } from './sections/MovieSections';
import { TheatersSection, RoomsSection, ShowtimesSection } from './sections/CinemaSections';
import { UserAccountsSection, UserRolesSection } from './sections/UserSections';
import { RevenueReportSection, TicketsReportSection, CustomersReportSection } from './sections/ReportSections';
import IntelligenceSection from './sections/IntelligenceSection';
import AttendanceSection from './sections/AttendanceSection';
import WorkforceSection from './sections/WorkforceSection';
import InventorySection from './sections/InventorySection';
import RefundSection from './sections/RefundSection';

const AdminContent = ({ view, store }) => {
  const { crud, dashboard, getTheaterName, movieList } = store;

  switch (view) {
    case ADMIN_VIEWS.DASHBOARD:
      return <DashboardSection dashboard={dashboard} users={crud.users} />;
    case ADMIN_VIEWS.MOVIES:
      return <MoviesSection crud={crud.movies} genres={crud.genres.list} />;
    case ADMIN_VIEWS.GENRES:
      return <GenresSection crud={crud.genres} />;
    case ADMIN_VIEWS.ACTORS:
      return <ActorsSection crud={crud.actors} />;
    case ADMIN_VIEWS.TRAILERS:
      return <TrailersSection crud={crud.trailers} movies={movieList} />;
    case ADMIN_VIEWS.THEATERS:
      return <TheatersSection crud={crud.theaters} />;
    case ADMIN_VIEWS.ROOMS:
      return <RoomsSection crud={crud.rooms} theaters={crud.theaters.list} getTheaterName={getTheaterName} />;
    case ADMIN_VIEWS.SHOWTIMES:
      return (
        <ShowtimesSection
          crud={crud.showtimes}
          movies={movieList}
          theaters={crud.theaters.list}
          rooms={crud.rooms.list}
        />
      );
    case ADMIN_VIEWS.USER_ACCOUNTS:
      return <UserAccountsSection crud={crud.users} />;
    case ADMIN_VIEWS.USER_ROLES:
      return <UserRolesSection crud={crud.users} />;
    case ADMIN_VIEWS.STAFF_ATTENDANCE:
      return <AttendanceSection />;
    case ADMIN_VIEWS.WORKFORCE:
      return <WorkforceSection />;
    case ADMIN_VIEWS.INVENTORY:
      return <InventorySection />;
    case ADMIN_VIEWS.REFUNDS:
      return <RefundSection />;
    case ADMIN_VIEWS.REPORT_REVENUE:
      return <RevenueReportSection />;
    case ADMIN_VIEWS.REPORT_TICKETS:
      return <TicketsReportSection />;
    case ADMIN_VIEWS.REPORT_CUSTOMERS:
      return <CustomersReportSection />;
    case ADMIN_VIEWS.INTELLIGENCE:
      return <IntelligenceSection rooms={crud.rooms.list} movies={movieList} onShowtimesChanged={crud.showtimes.reload} />;
    default:
      return <DashboardSection dashboard={dashboard} users={crud.users} />;
  }
};

export default AdminContent;
