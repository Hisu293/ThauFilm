import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, CardMedia, Dialog, Fade, IconButton, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LocalActivityRoundedIcon from '@mui/icons-material/LocalActivityRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { t } from '../i18n/labels';
import './MovieCard.css';

const formatScore = (movie) => {
  const score = movie.score ?? movie.popularity;
  if (typeof score === 'number' && Number.isFinite(score)) return score.toFixed(1);
  return '8.0';
};

const MovieCard = ({ movie, variant = 'nowShowing' }) => {
  const [openTrailer, setOpenTrailer] = useState(false);
  const isComingSoon = variant === 'comingSoon';
  const poster = movie.posterUrl || movie.poster || '/placeholder.svg';
  const ageRating = movie.ageRating || movie.rating || 'P';
  const trailerSrc = movie.trailerUrl || '';

  return (
    <>
      <Card className={`movie-card ${isComingSoon ? 'movie-card--soon' : ''}`} elevation={0}>
        <Box className="movie-card__media">
          <CardMedia
            component="img"
            image={poster}
            alt={movie.title}
            className="movie-card__poster"
            loading="lazy"
            onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
          />

          <Box className="movie-card__overlay">
            <Fade in timeout={180}>
              <Stack className="movie-card__actions" spacing={1.2}>
                <Button
                  component={RouterLink}
                  to={`/movies/${movie.id}`}
                  variant="contained"
                  startIcon={<LocalActivityRoundedIcon />}
                  className="movie-card__action movie-card__action--primary"
                >
                  {t('movies', 'bookTicket')}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<PlayCircleRoundedIcon />}
                  className="movie-card__action movie-card__action--secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpenTrailer(true);
                  }}
                >
                  {t('movies', 'trailer')}
                </Button>
              </Stack>
            </Fade>
          </Box>
        </Box>

        <CardContent className="movie-card__body">
          <Typography component="h3" className="movie-card__title" title={movie.title}>
            {movie.title}
          </Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box component="span" className="movie-card__age">
              {ageRating}
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.4} className="movie-card__score">
              <StarRoundedIcon />
              <Typography component="span">{formatScore(movie)}</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={openTrailer}
        onClose={() => setOpenTrailer(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#000',
            backgroundImage: 'none',
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ position: 'relative', pt: '56.25%' }}>
          <IconButton
            onClick={() => setOpenTrailer(false)}
            aria-label="Đóng trailer"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.55)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
          {trailerSrc ? (
            <iframe
              src={trailerSrc}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={1}
              sx={{
                position: 'absolute',
                inset: 0,
                color: '#fff',
                textAlign: 'center',
                px: 3,
              }}
            >
              <PlayCircleRoundedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Typography fontWeight={800}>Chưa có trailer</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                Hãy gán trailer cho phim này trong file movieTrailers.js.
              </Typography>
            </Stack>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default MovieCard;
