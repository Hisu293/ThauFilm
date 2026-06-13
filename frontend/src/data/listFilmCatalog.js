import { filmIndexFromFile, hashFilmAsset } from '../utils/filmHash';

/** Metadata khớp poster trong public/listfilm (film1–film16) */
const FILM_META = [
  {
    file: 'film1.jpg',
    title: 'Titanic 2',
    genre: 'Action',
    rating: '13+',
    duration: 120,
    releaseDate: '2026-05-14',
    price: 85000,
    isFeatured: true,
    isNowShowing: true,
    description: 'Hành trình sinh tồn và tình yêu giữa đại dương — phần tiếp theo của huyền thoại Titanic.',
  },
  {
    file: 'film2.jpg',
    title: 'Extraction 2',
    genre: 'Action',
    rating: 'G',
    duration: 105,
    price: 35000,
    isNowShowing: true,
    description: 'Tyler Rake trở lại với nhiệm vụ giải cứu đầy nguy hiểm và nhịp hành động không ngừng.',
  },
  {
    file: 'film3.jpg',
    title: 'Peaky Blinders',
    genre: 'Drama',
    rating: 'G',
    duration: 80,
    price: 75000,
    isNowShowing: true,
    description: 'Gia tộc Shelby thống trị đường phố Birmingham trong kỷ nguyên gangster cổ điển.',
  },
  {
    file: 'film4.jpg',
    title: 'Expendables 4',
    genre: 'Action',
    rating: '18+',
    duration: 135,
    price: 100000,
    isNowShowing: true,
    description: 'Đội tinh nhuệ huyền thoại tái hợp cho cuộc chiến nổ súng hoành tráng nhất.',
  },
  {
    file: 'film5.jpg',
    title: 'The Family Plan',
    genre: 'Comedy',
    rating: '13+',
    duration: 110,
    price: 30000,
    isNowShowing: true,
    description: 'Cựu sát thủ làm bố đơn thân phải đưa cả gia đình vào chuyến đi đầy rắc rối.',
  },
  {
    file: 'film6.jpg',
    title: 'Concrete Utopia',
    genre: 'Drama',
    rating: '13+',
    duration: 115,
    price: 80000,
    isNowShowing: true,
    description: 'Sau thảm họa, cư dân chung cư đấu tranh sinh tồn trong tòa nhà duy nhất còn đứng vững.',
  },
  {
    file: 'film7.jpg',
    title: 'Train to Busan',
    genre: 'Thriller',
    rating: '18+',
    duration: 125,
    price: 105000,
    isNowShowing: true,
    description: 'Chuyến tàu tốc hành Busan trở thành địa ngục zombie khi dịch bùng phát.',
  },
  {
    file: 'film8.jpg',
    title: 'Midway',
    genre: 'History',
    rating: 'G',
    duration: 90,
    price: 70000,
    isNowShowing: true,
    description: 'Tái hiện trận Midway — bước ngoặt Thái Bình Dương trong Chiến tranh thế giới thứ hai.',
  },
  {
    file: 'film9.jpg',
    title: 'Jumanji',
    genre: 'Adventure',
    rating: 'G',
    duration: 140,
    price: 95000,
    isNowShowing: true,
    description: 'Bốn người chơi bị hút vào trò chơi và phải hợp sức để thoát khỏi thế giới Jumanji.',
  },
  {
    file: 'film10.jpg',
    title: 'World War Z',
    genre: 'Action',
    rating: 'G',
    duration: 90,
    price: 35000,
    isNowShowing: true,
    description: 'Cựu điều tra viên LHQ săn manh mối để tìm vắc-xin giữa đại dịch zombie toàn cầu.',
  },
  {
    file: 'film11.jpg',
    title: 'Hacksaw Ridge',
    genre: 'War',
    rating: '18+',
    releaseDate: '2026-06-16',
    price: 90000,
    isComingSoon: true,
    description: 'Desmond Doss — người lính không cầm súng nhưng cứu sống hàng chục đồng đội tại Okinawa.',
  },
  {
    file: 'film12.jpg',
    title: 'The Kissing Booth 2',
    genre: 'Romance',
    rating: '13+',
    releaseDate: '2026-06-20',
    price: 88000,
    isComingSoon: true,
    description: 'Elle Evans bước vào năm học mới với những lựa chọn tình yêu và tình bạn phức tạp.',
  },
  {
    file: 'film13.jpg',
    title: 'Fall',
    genre: 'Romance',
    rating: '13+',
    releaseDate: '2026-06-22',
    price: 88000,
    isComingSoon: true,
    description: 'Hai phụ nữ leo tháp radio 600m và phải đối mặt với nỗi sợ độ cao để sống sót.',
  },
  {
    file: 'film14.jpg',
    title: 'The Meg',
    genre: 'Action',
    rating: '13+',
    releaseDate: '2026-07-01',
    price: 82000,
    isComingSoon: true,
    description: 'Đội thám hiểm đại dương sâu đụng độ cá mập tiền sử Megalodon khổng lồ.',
  },
  {
    file: 'film15.jpg',
    title: 'Avengers: Infinity War',
    genre: 'Action',
    rating: 'G',
    releaseDate: '2026-07-08',
    price: 90000,
    isComingSoon: true,
    description: 'Avengers và đồng minh tập hợp chống lại Thanos trong trận chiến vì vũ trụ.',
  },
  {
    file: 'film16.jpg',
    title: 'Black Panther',
    genre: 'Action',
    rating: '18+',
    releaseDate: '2026-07-15',
    price: 92000,
    isComingSoon: true,
    description: 'T\'Challa trở về Wakanda để nhận ngai vàng và bảo vệ vương quốc khỏi hiểm họa.',
  },
];

export const LIST_FILM_STORAGE_KEY = 'cinema_listfilm_catalog_v2';

export function buildListFilmMovies() {
  return FILM_META.map((item) => {
    const index = filmIndexFromFile(item.file);
    const poster = `/listfilm/${item.file}`;
    return {
      id: index,
      hashId: hashFilmAsset(item.file),
      slug: `film-${index}`,
      poster,
      posterPath: poster,
      title: item.title,
      genre: item.genre,
      rating: item.rating,
      duration: item.duration,
      releaseDate: item.releaseDate,
      price: item.price,
      isFeatured: Boolean(item.isFeatured),
      isNowShowing: Boolean(item.isNowShowing),
      isComingSoon: Boolean(item.isComingSoon),
      description: item.description,
    };
  });
}

export const listFilmMovies = buildListFilmMovies();

export const listFilmGenres = [
  'All',
  ...Array.from(new Set(listFilmMovies.map((m) => m.genre))).sort(),
];

export function saveListFilmToStorage(movies = listFilmMovies) {
  try {
    localStorage.setItem(LIST_FILM_STORAGE_KEY, JSON.stringify(movies));
    localStorage.removeItem('cinema_listfilm_catalog');
  } catch {
    /* ignore */
  }
}

export function loadListFilmFromStorage() {
  try {
    const raw = localStorage.getItem(LIST_FILM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function getListFilmMovieById(id) {
  const numId = Number(id);
  const fromStorage = loadListFilmFromStorage();
  const pool = fromStorage || listFilmMovies;
  return pool.find((m) => m.id === numId || m.hashId === numId) ?? null;
}
