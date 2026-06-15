import { useState, useEffect } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Divider,
  Skeleton, Stack, Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import { fetchMovieById } from '../services/movieService';
import './MovieDetailPage.css';

/* ---------- helpers ---------- */
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const STATUS_LABEL = {
  NOW_SHOWING: 'Đang chiếu',
  SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  UPCOMING: 'Sắp chiếu',
};

/* ---------- Skeleton loading ---------- */
const MovieDetailSkeleton = () => (
  <Box sx={{ minHeight: '100vh', bgcolor: '#0b0b0f', pt: { xs: 3, md: 6 }, pb: 8 }}>
    <Container maxWidth="lg">
      <Box className="mdp-skeleton" sx={{ width: 130, height: 36, mb: 4 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
        <Box className="mdp-skeleton" sx={{ flexShrink: 0, width: { xs: '100%', md: 280 }, aspectRatio: '2/3', borderRadius: 3 }} />
        <Box sx={{ flex: 1, width: '100%' }}>
          <Box className="mdp-skeleton" sx={{ width: '55%', height: 24, mb: 2 }} />
          <Box className="mdp-skeleton" sx={{ width: '80%', height: 48, mb: 2.5 }} />
          <Box className="mdp-skeleton" sx={{ width: '45%', height: 22, mb: 3 }} />
          <Box className="mdp-skeleton" sx={{ width: '100%', height: 90, mb: 3 }} />
          <Box className="mdp-skeleton" sx={{ width: '100%', height: 1, mb: 3 }} />
          <Box className="mdp-skeleton" sx={{ width: '60%', height: 22, mb: 1.5 }} />
          <Box className="mdp-skeleton" sx={{ width: '75%', height: 22, mb: 4 }} />
          <Box className="mdp-skeleton" sx={{ width: 180, height: 52, borderRadius: 2 }} />
        </Box>
      </Stack>
    </Container>
  </Box>
);

/* ---------- Error / Not found ---------- */
const MovieNotFound = ({ message }) => (
  <Box sx={{
    minHeight: '100vh', bgcolor: '#0b0b0f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Stack alignItems="center" spacing={2.5} sx={{ textAlign: 'center', px: 4 }}>
      <MovieRoundedIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
      <Typography variant="h5" fontWeight={800}>Không tìm thấy phim</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.55)', maxWidth: 400 }}>
        {message || 'Phim bạn tìm kiếm không tồn tại hoặc đã bị xóa.'}
      </Typography>
      <Button
        component={RouterLink}
        to="/movies"
        variant="contained"
        sx={{ bgcolor: '#e50914', '&:hover': { bgcolor: '#c10812' }, fontWeight: 700 }}
      >
        Quay lại danh sách phim
      </Button>
    </Stack>
  </Box>
);

/* =====================================================
   Main component
   ===================================================== */
const MovieDetailPage = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMovie(null);

    fetchMovieById(id)
      .then((m) => { if (!cancelled) setMovie(m); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Không tải được thông tin phim.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <MovieDetailSkeleton />;
  if (error || !movie) return <MovieNotFound message={error} />;

  /* --- derived values --- */
  const statusLabel = STATUS_LABEL[String(movie.status).toUpperCase()] ?? movie.status;
  const isNowShowing = movie.isNowShowing;

  const genres = (movie.genre || '')
    .split(',').map((g) => g.trim()).filter(Boolean);

  const actorList = (movie.actors || '')
    .split(',').map((a) => a.trim()).filter(Boolean);

  const posterSrc = movie.posterUrl || movie.poster || '/placeholder.svg';

  return (
    <Box className="mdp-root">
      {/* Blurred backdrop */}
      <div className="mdp-backdrop" style={{ backgroundImage: `url(${posterSrc})` }} />
      <div className="mdp-backdrop-overlay" />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 3, md: 6 }, pb: 10 }}>

        {/* Back button */}
        <Button
          component={RouterLink}
          to="/movies"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{
            mb: { xs: 3, md: 4 },
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600,
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          Danh sách phim
        </Button>

        {/* Main layout: Poster + Info */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
        >
          {/* ---- Poster ---- */}
          <Box className="mdp-poster-wrap">
            <img
              src={posterSrc}
              alt={movie.title}
              className="mdp-poster"
              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
            />
            {statusLabel && (
              <span className={`mdp-status-badge ${isNowShowing ? 'now' : 'soon'}`}>
                {statusLabel}
              </span>
            )}
          </Box>

          {/* ---- Info ---- */}
          <Box sx={{ flex: 1, minWidth: 0 }}>

            {/* Genre chips + age rating */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {genres.map((g) => (
                <Chip
                  key={g} label={g} size="small"
                  sx={{
                    bgcolor: 'rgba(229,9,20,0.14)',
                    color: '#ff7373',
                    border: '1px solid rgba(229,9,20,0.28)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                />
              ))}
              {movie.ageRating && (
                <Chip
                  label={movie.ageRating} size="small" variant="outlined"
                  sx={{ borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}
                />
              )}
            </Stack>

            {/* Title */}
            <Typography className="mdp-title">{movie.title}</Typography>

            {/* Score */}
            {movie.score !== null && (
              <Box className="mdp-score-ring" sx={{ mt: 2, mb: 0.5, display: 'inline-flex' }}>
                <StarRoundedIcon sx={{ color: '#facc15', fontSize: 18 }} />
                <Typography fontWeight={800} sx={{ color: '#facc15', fontSize: '1rem' }}>
                  {Number(movie.score).toFixed(1)}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>/10</Typography>
              </Box>
            )}

            {/* Meta row */}
            <Stack
              direction="row" spacing={3} flexWrap="wrap" useFlexGap
              sx={{ mt: 2, mb: 3, color: 'rgba(255,255,255,0.75)' }}
            >
              {movie.durationMinutes && (
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <AccessTimeRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} />
                  <Typography sx={{ fontSize: '0.93rem' }}>{movie.durationMinutes} phút</Typography>
                </Stack>
              )}
              {movie.releaseDate && (
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
                  <Typography sx={{ fontSize: '0.93rem' }}>{fmtDate(movie.releaseDate)}</Typography>
                </Stack>
              )}
              {movie.language && (
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <LanguageRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} />
                  <Typography sx={{ fontSize: '0.93rem' }}>{movie.language}</Typography>
                </Stack>
              )}
            </Stack>

            {/* Description */}
            <Typography className="mdp-desc">{movie.description}</Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.09)', my: 3 }} />

            {/* Cast & Crew */}
            <Box className="mdp-info-card">
              <Stack spacing={2.5}>
                {movie.director && (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <PersonRoundedIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.45)', fontSize: '0.73rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, mb: 0.4,
                      }}>
                        Đạo diễn
                      </Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.97rem' }}>
                        {movie.director}
                      </Typography>
                    </Box>
                  </Stack>
                )}

                {actorList.length > 0 && (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <GroupRoundedIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.45)', fontSize: '0.73rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, mb: 0.4,
                      }}>
                        Diễn viên
                      </Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.75 }}>
                        {actorList.join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* CTA */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              {isNowShowing ? (
                <Button
                  className="mdp-cta-btn"
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowRoundedIcon />}
                  sx={{
                    bgcolor: '#e50914',
                    '&:hover': { bgcolor: '#c10812' },
                    fontWeight: 800,
                    px: 4.5, py: 1.6,
                    borderRadius: 2,
                    fontSize: '1rem',
                    boxShadow: '0 6px 28px rgba(229,9,20,0.45)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#c10812',
                      boxShadow: '0 8px 36px rgba(229,9,20,0.6)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Đặt vé ngay
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<NotificationsRoundedIcon />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.28)',
                    color: '#fff',
                    fontWeight: 700,
                    px: 4.5, py: 1.6,
                    borderRadius: 2,
                    fontSize: '0.97rem',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.55)',
                      bgcolor: 'rgba(255,255,255,0.06)',
                    },
                  }}
                >
                  Nhắc tôi khi chiếu
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default MovieDetailPage;
