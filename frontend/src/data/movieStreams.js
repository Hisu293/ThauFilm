
// Hỗ trợ HLS (.m3u8) và các định dạng video trình duyệt phát trực tiếp như .mp4.
export const MOVIE_STREAMS_BY_ID = {
  '1d09ff4b-0ce1-406c-9138-9d3ef80748db': 'https://vip.opstream15.com/20231011/43760_3c6d3631/3000k/hls/mixed.m3u8', // The Flash
  '2ce8bb73-c29c-43f5-969e-43f90ed5fd89': 'https://vip.opstream14.com/20230321/33905_262f8bb8/3000k/hls/mixed.m3u8', // One Piece Film: Red
  '34b10241-3528-4970-accc-82972e74be5c': 'https://vip.opstream90.com/20250715/8842_551fdbb8/3000k/hls/mixed.m3u8', // Bí Kíp Luyện Rồng Live Action
  '3eb25820-ad43-4627-9f4f-54e345698c3a': 'https://vip.opstream13.com/20240805/5068_700ea1bb/3000k/hls/mixed.m3u8', // Vùng Đất Câm Lặng: Ngày 1
  '6321d8d3-0781-463a-b63b-87ff099a50c7': 'https://vip.opstream11.com/20230808/46367_8b66c8ab/3000k/hls/mixed.m3u8', // Người Nhện
  'bb37ffaf-d784-41ad-9c27-7d61543f0eb4': 'https://vip.opstream13.com/20251001/9600_75516177/3000k/hls/mixed.m3u8', // Đất Rừng Phương Nam
  'd41a7b9f-8f3c-47b4-98a9-6bfb9af5c634': 'https://vip.opstream90.com/20260127/23175_b6fd4efa/3000k/hls/mixed.m3u8', // Zootopia 2 / Phi Vụ Động Trời
  'da873771-9ec1-481f-b595-7c5b7f84b5a4': 'https://vip.opstream14.com/20220624/15426_a83d4662/3000k/hls/mixed.m3u8', // Bố Già
  'efcfab51-d71a-46b3-ac5e-b90a926967ec': 'https://vip.opstream16.com/20220303/426_e114a416/3000k/hls/mixed.m3u8', // Mắt Biếc
  'ffab6bb4-a063-4a1f-a9d8-9b4fbb764076': 'https://vip.opstream16.com/20230311/32915_5ef54c8f/3000k/hls/mixed.m3u8', // Thiên Long Bát Bộ: Kiều Phong Truyện
};

export const getMovieStreamUrl = (movie = {}) => {
  const fromApi = movie.streamUrl || movie.movieUrl || movie.playbackUrl;
  const fromId = movie.id ? MOVIE_STREAMS_BY_ID[String(movie.id)] : '';
  return String(fromApi || fromId || '').trim();
};
