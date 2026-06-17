export const MOVIE_TRAILERS_BY_ID = {
  
  '156feb6d-3697-44d4-b627-139e685c75e7': 'https://www.youtube.com/watch?v=Wt0y8IH63jg', '4097ee2f-0079-4b15-bd76-d68d8ad498a5': 'https://www.youtube.com/watch?v=geHK0BSKnXU', '50b6820f-e9ce-4db4-9fe6-d74c00995b09': 'https://www.youtube.com/watch?v=5R5ewCiqgXo',
  '601bc965-6d33-457b-a0ad-e1e0646134f2': 'https://www.youtube.com/watch?v=tCrdzzpk6qg','6f020096-247e-4ec1-8d91-cfea72334278': 'https://www.youtube.com/watch?v=9wVj8AxpT8A&t=1s','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'https://www.youtube.com/watch?v=JsTxPRKo5Bw',
  'abd72274-df7e-4dce-829f-ab346d628788': 'https://www.youtube.com/watch?v=hktzirCnJmQ','adbd9114-4fd1-43d4-9867-9d87d7f87490': 'https://www.youtube.com/watch?v=7Ma1uab-bQM','c117df1d-0ae0-40d3-946a-434db395c3fc': 'https://www.youtube.com/watch?v=E7_YI4z6SLM',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': 'https://www.youtube.com/watch?v=AfOlW2OrzqE', 'cc34cdd0-e613-4849-8073-371b3efa12bf': 'https://www.youtube.com/watch?v=HNYOQ9ADPno', 'd905a96d-d403-4254-a1c2-a2e3241f2eac': 'https://www.youtube.com/watch?v=ITlQ0oU7tDA'
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
