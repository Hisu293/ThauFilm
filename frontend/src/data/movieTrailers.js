export const MOVIE_TRAILERS_BY_ID = {
  '1d09ff4b-0ce1-406c-9138-9d3ef80748db': 'https://www.youtube.com/watch?v=E7_YI4z6SLM', // The Flash
  '2ce8bb73-c29c-43f5-969e-43f90ed5fd89': 'https://www.youtube.com/watch?v=7Ma1uab-bQM', // One Piece Film: Red
  '34b10241-3528-4970-accc-82972e74be5c': 'https://www.youtube.com/watch?v=tCrdzzpk6qg', // Bí Kíp Luyện Rồng Live Action
  '3eb25820-ad43-4627-9f4f-54e345698c3a': 'https://www.youtube.com/watch?v=9wVj8AxpT8A&t=1s', // Vùng Đất Câm Lặng: Ngày 1
  '6321d8d3-0781-463a-b63b-87ff099a50c7': 'https://www.youtube.com/watch?v=Wt0y8IH63jg', // Người Nhện: Beyond The Spider-Verse
  'bb37ffaf-d784-41ad-9c27-7d61543f0eb4': 'https://www.youtube.com/watch?v=hktzirCnJmQ', // Đất Rừng Phương Nam
  'd41a7b9f-8f3c-47b4-98a9-6bfb9af5c634': 'https://www.youtube.com/watch?v=HNYOQ9ADPno', // Zootopia 2
  'da873771-9ec1-481f-b595-7c5b7f84b5a4': 'https://www.youtube.com/watch?v=5R5ewCiqgXo', // Bố Già
  'efcfab51-d71a-46b3-ac5e-b90a926967ec': 'https://www.youtube.com/watch?v=ITlQ0oU7tDA', // Mắt Biếc
  'ffab6bb4-a063-4a1f-a9d8-9b4fbb764076': 'https://www.youtube.com/watch?v=geHK0BSKnXU', // Thiên Long Bát Bộ: Kiều Phong Truyện
};

export const MOVIE_TRAILERS_BY_TITLE = {
  // Example:
  // 'Bố Già': 'https://www.youtube.com/watch?v=your_video_id',
};

export const toTrailerEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) return trimmed;

      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const shortsId = parsed.pathname.startsWith('/shorts/')
        ? parsed.pathname.split('/').filter(Boolean)[1]
        : '';
      if (shortsId) return `https://www.youtube.com/embed/${shortsId}`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
};

export const getMovieTrailerUrl = (movie = {}) => {
  const fromApi = movie.trailerUrl || movie.trailer || movie.videoUrl;
  const fromId = movie.id ? MOVIE_TRAILERS_BY_ID[String(movie.id)] : '';
  const fromTitle = movie.title ? MOVIE_TRAILERS_BY_TITLE[movie.title] : '';

  return toTrailerEmbedUrl(fromApi || fromId || fromTitle);
};
