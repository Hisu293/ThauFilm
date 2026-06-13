import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';

const HeroBanner = ({ movie }) => {
  if (!movie) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        p: { xs: 3, md: 4.5 },
        background: 'linear-gradient(100deg, rgba(229, 9, 20, 0.15) 0%, rgba(0, 0, 0, 0) 65%), #131313',
        mb: { xs: 4, md: 5.5 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Grid container spacing={4} alignItems="center">
        <Grid item xs={12} md={7}>
          <Chip
            label={movie.genre || 'Featured'}
            color="primary"
            size="small"
            sx={{
              mb: 2,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.3rem' },
              fontWeight: 900,
              lineHeight: 1.15,
              mb: 2.5,
              color: '#fff',
            }}
          >
            {movie.title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3.5,
              maxWidth: 760,
              color: 'rgba(255,255,255,0.76)',
              lineHeight: 1.7,
              fontSize: { xs: '0.95rem', md: '1.05rem' },
            }}
          >
            {movie.description || 'Experience an immersive cinematic journey on the biggest screens in town.'}
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 4 }}
          >
            <Chip
              label={`Duration: ${movie.duration || 'TBA'} min`}
              variant="outlined"
              sx={{ borderColor: 'rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.85)' }}
            />
            <Chip
              label={`Release: ${movie.releaseDate || 'TBA'}`}
              variant="outlined"
              sx={{ borderColor: 'rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.85)' }}
            />
            <Chip
              label={`Age: ${movie.rating || 'TBA'}`}
              color="error"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to={`/movies/${movie.id}`}
              variant="contained"
              color="primary"
              size="large"
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                px: 4,
                py: 1.5,
                borderRadius: '10px',
                boxShadow: '0 6px 20px rgba(229, 9, 20, 0.35)',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(229, 9, 20, 0.55)',
                },
              }}
            >
              Book Now
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 3.5,
                py: 1.5,
                borderRadius: '10px',
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.7)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              Watch Trailer
            </Button>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box
            component="img"
            src={movie.poster}
            alt={movie.title}
            sx={{
              width: '100%',
              maxWidth: { xs: 280, md: 340 },
              maxHeight: 490,
              objectFit: 'cover',
              display: 'block',
              mx: { xs: 'auto', md: '0 0 0 auto' },
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 28px 54px rgba(0, 0, 0, 0.55)',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default HeroBanner;
