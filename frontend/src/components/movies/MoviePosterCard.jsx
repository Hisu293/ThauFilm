import { useState } from 'react';
import { Dialog, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import HlsVideoPlayer from '../HlsVideoPlayer';
import { getMovieTrailerUrl } from '../../data/movieTrailers';
import './MoviePosterCard.css';

const MoviePosterCard = ({ movie }) => {
  const navigate = useNavigate();
  const [openTrailer, setOpenTrailer] = useState(false);
  const trailerSrc = getMovieTrailerUrl(movie);
  const poster = movie.posterUrl || movie.poster || '/placeholder.svg';
  const isYoutubeTrailer = trailerSrc.includes('youtube.com/embed/');

  const genres = (movie.genre || '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 2);

  const year = movie.releaseYear || (movie.releaseDate ? String(movie.releaseDate).slice(0, 4) : null);

  return (
    <>
      <article className="mp-card" onClick={() => navigate(`/movies/${movie.id}`)}>
        <div className="mp-card__media">
          <img
            className="mp-card__poster"
            src={poster}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
          />
          <span className="mp-card__badge">{movie.rating || 'P'}</span>
          {movie.isNowShowing && <span className="mp-card__status-now">Đang chiếu</span>}
          {movie.isComingSoon && !movie.isNowShowing && <span className="mp-card__status-soon">Sắp chiếu</span>}
          <div className="mp-card__overlay">
            <div className="mp-card__actions">
              {movie.isNowShowing && (
                <button
                  type="button"
                  className="mp-card__cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/movies/${movie.id}?book=1`);
                  }}
                >
                  <ConfirmationNumberRoundedIcon fontSize="small" /> Đặt vé
                </button>
              )}
              <button
                type="button"
                className="mp-card__cta mp-card__cta--trailer"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenTrailer(true);
                }}
              >
                <PlayArrowRoundedIcon fontSize="small" /> Xem trailer
              </button>
            </div>
          </div>
        </div>
        <div className="mp-card__body">
          <h3 className="mp-card__title" title={movie.title}>{movie.title}</h3>
          <div className="mp-card__meta">
            {genres.length > 0 && <span className="mp-card__genres">{genres.join(', ')}</span>}
            {movie.duration && <span>{movie.duration}′</span>}
            {year && <span>{year}</span>}
          </div>
        </div>
      </article>

      <Dialog
        open={openTrailer}
        onClose={() => setOpenTrailer(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'mp-trailer-dialog' }}
      >
        <div className="mp-trailer">
          <IconButton
            className="mp-trailer__close"
            onClick={() => setOpenTrailer(false)}
            aria-label="Đóng trailer"
          >
            <CloseRoundedIcon />
          </IconButton>
          {trailerSrc ? (
            isYoutubeTrailer ? (
              <iframe
                src={trailerSrc}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <HlsVideoPlayer src={trailerSrc} title={`${movie.title} Trailer`} poster={poster} />
            )
          ) : (
            <div className="mp-trailer__empty">
              <PlayArrowRoundedIcon />
              <strong>Phim này chưa có trailer</strong>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default MoviePosterCard;
