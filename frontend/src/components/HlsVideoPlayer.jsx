import { useEffect, useRef, useState } from 'react';
import { Alert, Box } from '@mui/material';

const HLS_MIME_TYPE = 'application/vnd.apple.mpegurl';

const isHlsSource = (src) => {
  const clean = String(src || '').split('?')[0].toLowerCase();
  return clean.endsWith('.m3u8');
};

const HlsVideoPlayer = ({ src, title, poster }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    let hls;
    let cancelled = false;
    const showPlaybackError = () => {
      setError('Không thể phát video. Hãy kiểm tra URL, CORS và trạng thái máy chủ video.');
    };

    const initializePlayer = async () => {
      if (!isHlsSource(src) || video.canPlayType(HLS_MIME_TYPE)) {
        video.src = src;
        video.addEventListener('error', showPlaybackError);
        return;
      }

      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (!Hls.isSupported()) {
        showPlaybackError();
        return;
      }

      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) showPlaybackError();
      });
    };

    initializePlayer().catch(showPlaybackError);

    return () => {
      cancelled = true;
      video.removeEventListener('error', showPlaybackError);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  if (!src) {
    return <Alert severity="info">Phim này chưa được cấu hình URL phát online.</Alert>;
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box
        component="video"
        ref={videoRef}
        controls
        playsInline
        poster={poster || undefined}
        aria-label={title}
        sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', bgcolor: '#000' }}
      />
    </Box>
  );
};

export default HlsVideoPlayer;
