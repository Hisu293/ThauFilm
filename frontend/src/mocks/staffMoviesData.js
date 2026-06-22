/**
 * Dữ liệu mock cho module "Quản lý phim (Staff)".
 * Khớp schema backend GET/PUT /api/staff/movies — có bổ sung trailerUrl
 * (schema gốc chưa có) để UI quản lý trailer hoạt động.
 *
 * Mảng này được MSW dùng làm "cơ sở dữ liệu trong bộ nhớ": PUT sẽ ghi đè
 * trực tiếp vào đây nên dữ liệu giữ nguyên trong suốt phiên chạy.
 */
export const staffMoviesDb = [
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    title: 'Đất Rừng Phương Nam',
    description:
      'Hành trình phiêu lưu của bé An đi tìm cha giữa thiên nhiên trù phú và con người hào sảng của vùng đất phương Nam.',
    durationMinutes: 110,
    rating: 8.2,
    active: true,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster-dat-rung-phuong-nam.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    director: 'Nguyễn Quang Dũng',
    actors: 'Hạo Khang, Tuấn Trần, Trấn Thành',
    genre: 'Phiêu lưu, Tâm lý',
    releaseDate: '2026-06-20',
    language: 'Tiếng Việt',
    rated: 'T13',
    status: 'NOW_SHOWING',
  },
  {
    id: '9d2e4b18-6f3a-4c7d-9a21-5b8e7c1f0a44',
    title: 'Bố Già',
    description:
      'Câu chuyện cảm động về tình cha con trong một xóm lao động nghèo, nơi những hi sinh thầm lặng làm nên gia đình.',
    durationMinutes: 128,
    rating: 8.9,
    active: true,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster-bo-gia.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=oHg5SJYRHA0',
    director: 'Vũ Ngọc Đãng, Trấn Thành',
    actors: 'Trấn Thành, Tuấn Trần, Ngân Chi',
    genre: 'Gia đình, Tâm lý',
    releaseDate: '2026-05-12',
    language: 'Tiếng Việt',
    rated: 'T16',
    status: 'NOW_SHOWING',
  },
  {
    id: 'b71c3a90-2d4e-4f81-8c63-1a9f6e2d7b55',
    title: 'The Flash',
    description:
      'Barry Allen du hành thời gian để cứu gia đình mình, nhưng vô tình tạo ra một vũ trụ nơi mọi thứ đảo lộn.',
    durationMinutes: 144,
    rating: 6.8,
    active: true,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster-the-flash.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=hebWYacbdvc',
    director: 'Andy Muschietti',
    actors: 'Ezra Miller, Michael Keaton, Sasha Calle',
    genre: 'Hành động, Khoa học viễn tưởng',
    releaseDate: '2026-07-01',
    language: 'Tiếng Anh',
    rated: 'T13',
    status: 'COMING_SOON',
  },
  {
    id: 'c82d4ba1-3e5f-4092-9d74-2b0a7f3e8c66',
    title: 'Mai',
    description:
      'Một bộ phim tâm lý về người phụ nữ tên Mai và hành trình đi tìm hạnh phúc giữa những định kiến của cuộc đời.',
    durationMinutes: 131,
    rating: 8.5,
    active: false,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster-mai.jpg',
    trailerUrl: '',
    director: 'Trấn Thành',
    actors: 'Phương Anh Đào, Tuấn Trần, Hồng Đào',
    genre: 'Tâm lý, Tình cảm',
    releaseDate: '2026-04-20',
    language: 'Tiếng Việt',
    rated: 'T18',
    status: 'STOPPED',
  },
];

/** Các field hợp lệ cho PUT /api/staff/movies/{movieId}. */
export const STAFF_MOVIE_FIELDS = [
  'title',
  'description',
  'durationMinutes',
  'rating',
  'active',
  'posterUrl',
  'trailerUrl',
  'director',
  'actors',
  'genre',
  'releaseDate',
  'language',
  'rated',
  'status',
];
