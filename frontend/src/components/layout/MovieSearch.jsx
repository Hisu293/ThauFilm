import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, InputBase, Paper, Stack, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useNavigate } from 'react-router-dom';
import { fetchMovies } from '../../services/movieService';

const normalize = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function MovieSearch({ onNavigate }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMovies()
      .then(({ movies: result }) => {
        if (active) setMovies(result);
      })
      .catch(() => {
        if (active) setMovies([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeWhenClickingOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setFocused(false);
    };
    document.addEventListener('mousedown', closeWhenClickingOutside);
    return () => document.removeEventListener('mousedown', closeWhenClickingOutside);
  }, []);

  const results = useMemo(() => {
    const keyword = normalize(query);
    if (keyword.length < 2) return [];
    return movies
      .filter((movie) =>
        [movie.title, movie.genre, movie.actors, movie.director]
          .some((value) => normalize(value).includes(keyword)))
      .slice(0, 6);
  }, [movies, query]);

  const openMovie = (movie) => {
    setQuery('');
    setFocused(false);
    navigate(`/movies/${movie.id}`);
    onNavigate?.();
  };

  const showDropdown = focused && query.trim().length >= 2;

  return (
    <Box ref={rootRef} sx={{ position: 'relative', width: { xs: '100%', lg: 260, xl: 330 }, flexShrink: 0 }}>
      <Paper
        component="form"
        elevation={0}
        onSubmit={(event) => {
          event.preventDefault();
          if (results[0]) openMovie(results[0]);
        }}
        sx={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          borderRadius: 2.5,
          bgcolor: focused ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.08)',
          border: '1px solid',
          borderColor: focused ? 'rgba(229,9,20,0.65)' : 'rgba(255,255,255,0.1)',
          transition: 'border-color .2s, background-color .2s',
        }}
      >
        <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.72)', mr: 1, fontSize: 22 }} />
        <InputBase
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Tìm kiếm phim, diễn viên"
          inputProps={{ 'aria-label': 'Tìm kiếm phim hoặc diễn viên' }}
          sx={{
            flex: 1,
            color: '#fff',
            fontSize: '.9rem',
            '& input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
          }}
        />
        {loading && <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,.65)' }} />}
      </Paper>

      {showDropdown && (
        <Paper
          elevation={18}
          sx={{
            position: 'absolute',
            zIndex: 1500,
            top: 52,
            left: 0,
            width: { xs: '100%', lg: 360, xl: 420 },
            maxHeight: 420,
            overflowY: 'auto',
            bgcolor: 'rgba(17,17,20,.98)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 2.5,
            p: 1,
          }}
        >
          {results.map((movie) => (
            <Stack
              key={movie.id}
              component="button"
              type="button"
              direction="row"
              spacing={1.5}
              onClick={() => openMovie(movie)}
              sx={{
                width: '100%',
                p: 1,
                border: 0,
                borderRadius: 1.5,
                bgcolor: 'transparent',
                color: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
              }}
            >
              <Box
                component="img"
                src={movie.posterUrl || '/placeholder.svg'}
                alt=""
                sx={{ width: 46, height: 64, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0, alignSelf: 'center' }}>
                <Typography noWrap sx={{ color: '#fff', fontWeight: 750, fontSize: '.9rem' }}>
                  {movie.title}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: 'rgba(255,255,255,.56)' }}>
                  {[movie.releaseYear, movie.genre, movie.duration ? `${movie.duration} phút` : ''].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            </Stack>
          ))}
          {!loading && results.length === 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,.62)', p: 2, textAlign: 'center', fontSize: '.88rem' }}>
              Không tìm thấy phim phù hợp.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
