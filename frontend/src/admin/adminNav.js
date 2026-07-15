import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MovieFilterRoundedIcon from '@mui/icons-material/MovieFilterRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import FaceRoundedIcon from '@mui/icons-material/FaceRounded';
import OndemandVideoRoundedIcon from '@mui/icons-material/OndemandVideoRounded';
import TheaterComedyRoundedIcon from '@mui/icons-material/TheaterComedyRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import LoyaltyRoundedIcon from '@mui/icons-material/LoyaltyRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import PunchClockRoundedIcon from '@mui/icons-material/PunchClockRounded';

export const ADMIN_VIEWS = {
  DASHBOARD: 'dashboard',
  MOVIES: 'movies',
  GENRES: 'genres',
  ACTORS: 'actors',
  TRAILERS: 'trailers',
  THEATERS: 'theaters',
  ROOMS: 'rooms',
  SHOWTIMES: 'showtimes',
  USER_ACCOUNTS: 'user-accounts',
  USER_ROLES: 'user-roles',
  STAFF_ATTENDANCE: 'staff-attendance',
  REPORT_REVENUE: 'report-revenue',
  REPORT_TICKETS: 'report-tickets',
  REPORT_CUSTOMERS: 'report-customers',
  INTELLIGENCE: 'intelligence',
};

export const ADMIN_NAV_GROUPS = [
  {
    id: 'intelligence',
    label: 'AI vận hành',
    defaultOpen: true,
    items: [{ id: ADMIN_VIEWS.INTELLIGENCE, label: 'Cinema Intelligence', icon: PsychologyRoundedIcon }],
  },
  {
    id: 'overview',
    label: null,
    items: [{ id: ADMIN_VIEWS.DASHBOARD, label: 'Tổng quan', icon: DashboardRoundedIcon }],
  },
  {
    id: 'movies',
    label: 'Quản lý phim',
    defaultOpen: true,
    items: [
      { id: ADMIN_VIEWS.MOVIES, label: 'Danh sách phim', icon: MovieFilterRoundedIcon },
      { id: ADMIN_VIEWS.GENRES, label: 'Thể loại', icon: CategoryRoundedIcon },
      { id: ADMIN_VIEWS.ACTORS, label: 'Diễn viên', icon: FaceRoundedIcon },
      { id: ADMIN_VIEWS.TRAILERS, label: 'Trailer', icon: OndemandVideoRoundedIcon },
    ],
  },
  {
    id: 'cinema',
    label: 'Rạp & suất chiếu',
    defaultOpen: false,
    items: [
      { id: ADMIN_VIEWS.THEATERS, label: 'Quản lý rạp', icon: TheaterComedyRoundedIcon },
      { id: ADMIN_VIEWS.ROOMS, label: 'Phòng chiếu', icon: MeetingRoomRoundedIcon },
      { id: ADMIN_VIEWS.SHOWTIMES, label: 'Suất chiếu', icon: ScheduleRoundedIcon },
    ],
  },
  {
    id: 'users',
    label: 'Người dùng',
    defaultOpen: false,
    items: [
      { id: ADMIN_VIEWS.USER_ACCOUNTS, label: 'Tài khoản', icon: ManageAccountsRoundedIcon },
      { id: ADMIN_VIEWS.USER_ROLES, label: 'Phân quyền', icon: AdminPanelSettingsRoundedIcon },
      { id: ADMIN_VIEWS.STAFF_ATTENDANCE, label: 'Chấm công nhân viên', icon: PunchClockRoundedIcon },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    defaultOpen: false,
    items: [
      { id: ADMIN_VIEWS.REPORT_REVENUE, label: 'Doanh thu', icon: PaidRoundedIcon },
      { id: ADMIN_VIEWS.REPORT_TICKETS, label: 'Thống kê vé', icon: ConfirmationNumberRoundedIcon },
      { id: ADMIN_VIEWS.REPORT_CUSTOMERS, label: 'Khách hàng', icon: LoyaltyRoundedIcon },
    ],
  },
];

export const VIEW_META = {
  [ADMIN_VIEWS.DASHBOARD]: { title: 'Tổng quan', subtitle: 'Thống kê nhanh hệ thống đặt vé' },
  [ADMIN_VIEWS.MOVIES]: { title: 'Quản lý phim', subtitle: 'Thêm, sửa, xóa phim đang chiếu' },
  [ADMIN_VIEWS.GENRES]: { title: 'Quản lý thể loại', subtitle: 'CRUD thể loại phim' },
  [ADMIN_VIEWS.ACTORS]: { title: 'Quản lý diễn viên', subtitle: 'CRUD diễn viên' },
  [ADMIN_VIEWS.TRAILERS]: { title: 'Quản lý trailer', subtitle: 'Upload và gán trailer cho phim' },
  [ADMIN_VIEWS.THEATERS]: { title: 'Quản lý rạp', subtitle: 'Thêm, sửa, xóa rạp chiếu' },
  [ADMIN_VIEWS.ROOMS]: { title: 'Phòng chiếu', subtitle: 'Thêm phòng và cấu hình sơ đồ ghế' },
  [ADMIN_VIEWS.SHOWTIMES]: { title: 'Suất chiếu', subtitle: 'Tạo suất và phân công phòng' },
  [ADMIN_VIEWS.USER_ACCOUNTS]: { title: 'Tài khoản người dùng', subtitle: 'Xem danh sách, khóa / mở khóa' },
  [ADMIN_VIEWS.USER_ROLES]: { title: 'Phân quyền', subtitle: 'Customer · Staff · Admin' },
  [ADMIN_VIEWS.STAFF_ATTENDANCE]: { title: 'Chấm công nhân viên', subtitle: 'Quản lý check-in, check-out và giờ làm việc' },
  [ADMIN_VIEWS.REPORT_REVENUE]: { title: 'Báo cáo doanh thu', subtitle: 'Theo ngày, tháng và phim' },
  [ADMIN_VIEWS.REPORT_TICKETS]: { title: 'Thống kê vé', subtitle: 'Vé bán ra và vé hủy' },
  [ADMIN_VIEWS.REPORT_CUSTOMERS]: { title: 'Thống kê khách hàng', subtitle: 'Khách mới và khách thân thiết' },
  [ADMIN_VIEWS.INTELLIGENCE]: { title: 'AI Cinema Intelligence', subtitle: 'Tối ưu ghế, giá vé và lịch chiếu' },
};
