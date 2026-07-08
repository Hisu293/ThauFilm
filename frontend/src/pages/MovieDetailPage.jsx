import { useState, useEffect } from 'react';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Divider,
  Stack, Typography, Dialog, IconButton
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import CloseIcon from '@mui/icons-material/Close';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';

import { fetchMovieById } from '../services/movieService';
import movieStreamService from '../services/movieStreamService';
import watchPartyService from '../services/watchPartyService';
import { useBookingFlow } from '../context/BookingContext';
import { useBookingNavigate } from '../context/BookingNavigationContext';
import BookingStepper from '../components/BookingStepper';
import ShowtimeSelector from '../components/ShowtimeSelector';
import StatusChip from '../components/common/StatusChip';
import HlsVideoPlayer from '../components/HlsVideoPlayer';
import './MovieDetailPage.css';

/* ---------- helpers ---------- */
const fmtDate = (dateStr) => {
  if (!dateStr) return 'â€”';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/* ---------- Skeleton loading ---------- */
const MovieDetailSkeleton = () => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: { xs: 3, md: 6 }, pb: 8 }}>
    <Container maxWidth="xl">
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
    minHeight: '100vh', bgcolor: 'background.default', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Stack alignItems="center" spacing={2.5} sx={{ textAlign: 'center', px: 4 }}>
      <MovieRoundedIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
      <Typography variant="h5" fontWeight={800}>Không tìm thấy phim</Typography>
      <Typography sx={{ color: 'text.secondary', maxWidth: 400 }}>
        {message || 'Phim bạn tìm kiếm không tồn tại hoặc đã bị xóa.'}
      </Typography>
      <Button
        component={RouterLink}
        to="/movies"
        variant="contained"
        color="primary"
        sx={{ fontWeight: 700 }}
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
  const navigate = useBookingNavigate();
  const { updateBookingState } = useBookingFlow();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openOnlineMovie, setOpenOnlineMovie] = useState(false);
  const [onlineStreamUrl, setOnlineStreamUrl] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [creatingWatchParty, setCreatingWatchParty] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setMovie(null);
    });

    fetchMovieById(id)
      .then((m) => {
        if (!cancelled) {
          if (!m || !m.title || m.title === 'Phim chưa đặt tên') {
            const fallback = null;
            if (fallback) {
              setMovie(fallback);
            } else {
              setMovie(m);
            }
          } else {
            setMovie(m);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const fallback = null;
          if (fallback) {
            setMovie(fallback);
          } else {
            setError(err.message || 'Không tải được thông tin phim.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <MovieDetailSkeleton />;
  if (error || !movie) return <MovieNotFound message={error} />;

  /* --- derived values --- */
  const genres = (movie.genre || '')
    .split(',').map((g) => g.trim()).filter(Boolean);

  const actorList = (movie.actors || '')
    .split(',').map((a) => a.trim()).filter(Boolean);

  const posterSrc = movie.posterUrl || movie.poster || '/placeholder.svg';

  const handleSelectShowtime = (showtime) => {
    updateBookingState({
      selectedMovie: movie,
      selectedShowtime: showtime,
      selectedSeats: [],
      bookingId: null,
      paymentStatus: 'SELECTING_SEATS',
    });
    navigate(`/booking/seats/${showtime.id}`, {
      state: {
        movie,
        showtime
      }
    });
  };

  const handleOpenOnlineMovie = async () => {
    setOpenOnlineMovie(true);
    setStreamLoading(true);
    setStreamError('');
    try {
      const stream = await movieStreamService.getMovieStream(movie.id);
      setOnlineStreamUrl(stream?.streamUrl || '');
    } catch (err) {
      setOnlineStreamUrl('');
      setStreamError(err.message || 'Khong the lay link xem phim online.');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleCreateWatchParty = async () => {
    setCreatingWatchParty(true);
    try {
      const room = await watchPartyService.create(movie.id);
      navigate(`/watch-party/${room.id}`);
    } catch (err) {
      setError(err.message || 'Không thể tạo phòng xem nhóm.');
    } finally {
      setCreatingWatchParty(false);
    }
  };

  return (
    <Box className="mdp-root" sx={{ bgcolor: 'background.default', pb: 10 }}>
      {/* Blurred backdrop */}
      <div className="mdp-backdrop" style={{ backgroundImage: `url(${posterSrc})` }} />
      <div className="mdp-backdrop-overlay" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.6) 0%, #0F172A 100%)' }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, pt: { xs: 2, md: 4 } }}>
        
        {/* Progress Stepper */}
        <BookingStepper activeStep={0} />

        {/* Back button */}
        <Button
          component={RouterLink}
          to="/movies"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{
            mb: { xs: 3, md: 4 },
            color: 'text.secondary',
            fontWeight: 600,
            pl: 0,
            '&:hover': { color: 'primary.main', bgcolor: 'transparent', transform: 'translateX(-4px)' },
          }}
        >
          Danh sách phim
        </Button>

        {/* Main layout: Poster + Info */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
          sx={{ mb: 6 }}
        >
          {/* ---- Poster ---- */}
          <Box className="mdp-poster-wrap" sx={{ boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(148,163,184,0.1)' }}>
            <img
              src={posterSrc}
              alt={movie.title}
              className="mdp-poster"
              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
            />
            {movie.status && (
              <span className={`mdp-status-badge ${movie.isNowShowing ? 'now' : 'soon'}`} style={{ backgroundColor: movie.isNowShowing ? '#FBBF24' : '#64748B', color: movie.isNowShowing ? '#0F172A' : '#fff', fontWeight: 800 }}>
                {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
              </span>
            )}
          </Box>

          {/* ---- Info ---- */}
          <Box sx={{ flex: 1, minWidth: 0 }}>

            {/* Genre chips + age rating */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
              {genres.map((g) => (
                <Chip
                  key={g} label={g} size="small"
                  sx={{
                    bgcolor: 'rgba(251,191,36,0.1)',
                    color: 'primary.main',
                    border: '1px solid rgba(251,191,36,0.2)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                />
              ))}
              {movie.ageRating && (
                <StatusChip label={movie.ageRating} type="age" />
              )}
            </Stack>

            {/* Title */}
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {movie.title}
            </Typography>
            
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                {movie.originalTitle}
              </Typography>
            )}

            {/* Score */}
            {movie.score !== null && movie.score !== undefined && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', px: 1.8, py: 0.8, borderRadius: 2, mb: 3 }}>
                <StarRoundedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                <Typography fontWeight={800} sx={{ color: 'primary.main', fontSize: '1.1rem', lineHeight: 1 }}>
                  {Number(movie.score).toFixed(1)}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>/ 10</Typography>
              </Box>
            )}

            {/* Meta row */}
            <Stack
              direction="row" spacing={3.5} flexWrap="wrap" useFlexGap
              sx={{ mb: 3.5, color: 'text.secondary' }}
            >
              {(movie.durationMinutes || movie.duration) && (
                <Stack direction="row" alignItems="center" spacing={0.8}>
                  <AccessTimeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: '0.93rem', fontWeight: 500 }}>
                    {movie.durationMinutes || movie.duration} phút
                  </Typography>
                </Stack>
              )}
              {movie.releaseDate && (
                <Stack direction="row" alignItems="center" spacing={0.8}>
                  <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: '0.93rem', fontWeight: 500 }}>{fmtDate(movie.releaseDate)}</Typography>
                </Stack>
              )}
              {movie.language && (
                <Stack direction="row" alignItems="center" spacing={0.8}>
                  <LanguageRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: '0.93rem', fontWeight: 500 }}>{movie.language}</Typography>
                </Stack>
              )}
            </Stack>

            {/* Description */}
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3.5, lineHeight: 1.7, fontSize: '1rem', maxWidth: '800px' }}>
              {movie.description}
            </Typography>

            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)', my: 3 }} />

            {/* Cast & Crew */}
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid rgba(148,163,184,0.06)', mb: 4 }}>
              <Stack spacing={2.5}>
                {movie.director && (
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <PersonRoundedIcon sx={{ color: 'primary.main', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{
                        color: 'text.secondary', fontSize: '0.73rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, mb: 0.4,
                      }}>
                        Đạo diễn
                      </Typography>
                      <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.97rem' }}>
                        {movie.director}
                      </Typography>
                    </Box>
                  </Stack>
                )}

                {actorList.length > 0 && (
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <GroupRoundedIcon sx={{ color: 'primary.main', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{
                        color: 'text.secondary', fontSize: '0.73rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, mb: 0.4,
                      }}>
                        Diễn viên
                      </Typography>
                      <Typography sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.7 }}>
                        {actorList.join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* Online movie CTA */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={handleOpenOnlineMovie}
                disabled={streamLoading}
                sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 700, px: 4.5, py: 1.6, borderRadius: 2 }}
              >
                {streamLoading ? 'Dang tai...' : 'Xem phim online'}
              </Button>
              <Button
                component={RouterLink}
                to={`/movies/${movie.id}/community`}
                variant="text"
                size="large"
                startIcon={<ForumRoundedIcon />}
                sx={{ fontWeight: 700, px: 3 }}
              >
                Xem đánh giá cộng đồng
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<GroupRoundedIcon />}
                onClick={handleCreateWatchParty}
                disabled={creatingWatchParty}
                sx={{ fontWeight: 800, px: 4, py: 1.6, borderRadius: 2 }}
              >
                Tạo phòng xem nhóm
              </Button>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)', my: 4 }} />

        {/* Showtimes Selection Section */}
        <ShowtimeSelector movieId={movie.id} onSelectShowtime={handleSelectShowtime} />


      </Container>

      {/* Online movie player */}
      <Dialog
        open={openOnlineMovie}
        onClose={() => setOpenOnlineMovie(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#000',
            boxShadow: 'none',
            backgroundImage: 'none',
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ position: 'relative', p: { xs: 1, sm: 2 }, pt: { xs: 6, sm: 6 } }}>
          <IconButton
            onClick={() => setOpenOnlineMovie(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.5)',
              zIndex: 1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
            }}
          >
            <CloseIcon />
          </IconButton>
          <HlsVideoPlayer
            key={onlineStreamUrl}
            src={onlineStreamUrl}
            title={`${movie.title} Online`}
            poster={posterSrc}
          />
          {streamError && (
            <Box sx={{ color: '#fca5a5', fontWeight: 700, px: 1, py: 1.5 }}>
              {streamError}
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default MovieDetailPage;
