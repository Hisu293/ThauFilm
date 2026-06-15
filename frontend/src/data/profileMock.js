export const profileUser = {
  name: 'Nguyễn Minh Anh',
  email: 'minhanh@gmail.com',
  phone: '0901 234 567',
  birthday: '1998-04-12',
  gender: 'Nữ',
  avatar: '',
  tier: 'V-Star',
  points: 3450,
  nextTier: 'V-Diamond',
  nextTierAt: 5000,
};

export const bookingHistory = [
  {
    id: 'BK-20260518-001',
    movie: 'Train to Busan',
    poster: '/placeholder.svg',
    cinema: 'CGV Vincom Center',
    showtime: '18/05/2026 · 19:25',
    seats: ['G7', 'G8'],
    bookedAt: '15/05/2026',
    status: 'Đã xem',
  },
  {
    id: 'BK-20260502-014',
    movie: 'Expendables 4',
    poster: '/placeholder.svg',
    cinema: 'Galaxy Nguyễn Du',
    showtime: '02/05/2026 · 21:50',
    seats: ['H5'],
    bookedAt: '30/04/2026',
    status: 'Đã xem',
  },
  {
    id: 'BK-20260410-022',
    movie: 'Concrete Utopia',
    poster: '/placeholder.svg',
    cinema: 'Lotte Cinema Landmark',
    showtime: '10/04/2026 · 14:40',
    seats: ['C3', 'C4', 'C5'],
    bookedAt: '08/04/2026',
    status: 'Đã hủy',
  },
];

export const upcomingTickets = [
  {
    id: 'BK-20260612-007',
    movie: 'Titanic 2',
    poster: '/placeholder.svg',
    cinema: 'BHD Star Vincom',
    showtime: '12/06/2026 · 20:00',
    seats: ['E9', 'E10'],
    bookedAt: '06/06/2026',
    status: 'Sắp chiếu',
  },
  {
    id: 'BK-20260615-031',
    movie: 'The Family Plan',
    poster: '/placeholder.svg',
    cinema: 'Beta Cinema Mỹ Đình',
    showtime: '15/06/2026 · 17:00',
    seats: ['B2'],
    bookedAt: '07/06/2026',
    status: 'Sắp chiếu',
  },
];

export const favoriteMovies = [
  { id: 3, title: 'Peaky Blinders', poster: '/placeholder.svg', genre: 'Drama', rating: 8.6 },
  { id: 7, title: 'Train to Busan', poster: '/placeholder.svg', genre: 'Thriller', rating: 9.1 },
  { id: 12, title: 'Phim hành động', poster: '/placeholder.svg', genre: 'Action', rating: 8.2 },
  { id: 9, title: 'Phim chính kịch', poster: '/placeholder.svg', genre: 'Drama', rating: 7.8 },
  { id: 14, title: 'Phim lịch sử', poster: '/placeholder.svg', genre: 'History', rating: 8.0 },
];
