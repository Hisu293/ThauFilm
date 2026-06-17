export const labels = {
  vi: {
    common: {
      home: 'Trang chủ',
      login: 'Đăng nhập',
      register: 'Đăng ký',
      dashboard: 'Bảng điều khiển',
      revenue: 'Doanh thu',
      checkIn: 'Kiểm tra vé',
      customerSupport: 'Hỗ trợ khách hàng',
      search: 'Tìm kiếm',
      filter: 'Bộ lọc',
      loading: 'Đang xử lý...',
      empty: 'Không có dữ liệu',
      back: 'Quay lại',
      loadMore: 'Xem thêm',
    },
    movies: {
      title: 'Phim tại rạp',
      nowShowing: 'Đang chiếu',
      comingSoon: 'Sắp chiếu',
      bookTicket: 'Đặt vé',
      trailer: 'Xem trailer',
      searchTitle: 'Tìm kiếm phim',
      searchByName: 'Tìm phim theo tên',
      genre: 'Thể loại',
      location: 'Khu vực',
      noMatches: 'Không tìm thấy phim phù hợp.',
      noComingSoon: 'Không có phim sắp chiếu.',
    },
  },
  en: {
    common: {
      home: 'Home',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      revenue: 'Revenue',
      checkIn: 'Check-in',
      customerSupport: 'Customer Support',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      empty: 'No data',
      back: 'Back',
      loadMore: 'Load More',
    },
    movies: {
      title: 'Movies',
      nowShowing: 'Now Showing',
      comingSoon: 'Coming Soon',
      bookTicket: 'Book Ticket',
      trailer: 'Watch Trailer',
      searchTitle: 'Find movies',
      searchByName: 'Search by movie name',
      genre: 'Genre',
      location: 'Location',
      noMatches: 'No matching movies found.',
      noComingSoon: 'No coming-soon movies.',
    },
  },
};

export const DEFAULT_LOCALE = 'vi';
export const t = (section, key, locale = DEFAULT_LOCALE) =>
  labels[locale]?.[section]?.[key] ?? labels.vi?.[section]?.[key] ?? key;

export default labels;
