import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import LocalActivityRoundedIcon from '@mui/icons-material/LocalActivityRounded';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuickBooking } from '../../hooks/useQuickBooking';
import './QuickBooking.css';

// Format a YYYY-MM-DD date string to a human-readable Vietnamese date.
const formatDate = (dateStr) => {
  if (!dateStr) return dateStr;
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(dateStr + 'T00:00:00'));
  } catch {
    return dateStr;
  }
};

const QuickBooking = () => {
  const navigate = useNavigate();
  const [touched, setTouched] = useState(false);

  const {
    movies,
    theaters,
    availableDates,
    availableSlots,
    moviesLoading,
    theatersLoading,
    showtimesLoading,
    moviesError,
    selectedMovieId,
    selectedTheaterId,
    selectedDate,
    selectedShowtimeId,
    handleMovieChange,
    handleTheaterChange,
    handleDateChange,
    handleShowtimeChange,
    isReady,
  } = useQuickBooking();

  const missing = (key) => {
    if (!touched) return false;
    const values = {
      movie: selectedMovieId,
      cinema: selectedTheaterId,
      date: selectedDate,
      showtime: selectedShowtimeId,
    };
    return !values[key];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isReady) return;

    // Build minimal movie and showtime objects so SeatSelectionPage can display them
    // without needing to re-fetch. Full API data is already available there.
    const movieObj = movies.find((m) => m.id === selectedMovieId) ?? { id: selectedMovieId, title: '' };
    const slotObj = availableSlots.find((s) => s.id === selectedShowtimeId);
    const theaterObj = theaters.find((t) => t.id === selectedTheaterId) ?? { id: selectedTheaterId, name: '' };

    const showtimeObj = slotObj
      ? {
          id: slotObj.id,
          time: slotObj.time,
          date: selectedDate,
          room: slotObj.room,
          format: slotObj.format,
          theaterName: theaterObj.name,
        }
      : { id: selectedShowtimeId };

    navigate(`/booking/seats/${selectedShowtimeId}`, {
      state: { movie: movieObj, showtime: showtimeObj },
    });
  };

  if (moviesError) {
    return (
      <div className="quick-booking">
        <div className="quick-booking__card">
          <p style={{ color: 'rgba(255,200,200,0.85)', margin: 0, fontSize: '0.9rem' }}>
            ⚠️ {moviesError}
          </p>
        </div>
      </div>
    );
  }

  const isEmpty = !moviesLoading && movies.length === 0;

  return (
    <div className="quick-booking">
      <form className="quick-booking__card" onSubmit={handleSubmit} noValidate>
        <h3 className="quick-booking__title">
          <LocalActivityRoundedIcon sx={{ color: '#e50914' }} />
          Mua Vé <span>Nhanh</span>
        </h3>

        {isEmpty ? (
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Hiện chưa có phim để đặt vé. Vui lòng quay lại sau.
          </p>
        ) : (
          <div className="quick-booking__grid">
            {/* ── 1. Chọn Phim ───────────────────────────────────────────── */}
            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-movie">Chọn Phim</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="qb-movie"
                  className={`qb-field__control ${missing('movie') ? 'is-invalid' : ''}`}
                  value={selectedMovieId}
                  onChange={(e) => handleMovieChange(e.target.value)}
                  disabled={moviesLoading}
                >
                  <option value="">
                    {moviesLoading ? 'Đang tải…' : '-- Chọn phim --'}
                  </option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                {moviesLoading && (
                  <CircularProgress
                    size={14}
                    sx={{ position: 'absolute', right: 10, top: '50%', mt: '-7px', color: '#e50914' }}
                  />
                )}
              </div>
              <span className="qb-error">{missing('movie') ? 'Vui lòng chọn phim' : ''}</span>
            </div>

            {/* ── 2. Chọn Rạp ────────────────────────────────────────────── */}
            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-cinema">Chọn Rạp</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="qb-cinema"
                  className={`qb-field__control ${missing('cinema') ? 'is-invalid' : ''}`}
                  value={selectedTheaterId}
                  onChange={(e) => handleTheaterChange(e.target.value)}
                  disabled={!selectedMovieId || theatersLoading}
                >
                  <option value="">
                    {theatersLoading ? 'Đang tải rạp…' : !selectedMovieId ? '-- Chọn phim trước --' : '-- Chọn rạp --'}
                  </option>
                  {theaters.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {theatersLoading && (
                  <CircularProgress
                    size={14}
                    sx={{ position: 'absolute', right: 10, top: '50%', mt: '-7px', color: '#e50914' }}
                  />
                )}
              </div>
              <span className="qb-error">{missing('cinema') ? 'Vui lòng chọn rạp' : ''}</span>
            </div>

            {/* ── 3. Chọn Ngày ───────────────────────────────────────────── */}
            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-date">Chọn Ngày</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="qb-date"
                  className={`qb-field__control ${missing('date') ? 'is-invalid' : ''}`}
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={!selectedTheaterId || showtimesLoading || availableDates.length === 0}
                >
                  <option value="">
                    {showtimesLoading
                      ? 'Đang tải ngày…'
                      : !selectedTheaterId
                      ? '-- Chọn rạp trước --'
                      : availableDates.length === 0
                      ? '-- Không có lịch --'
                      : '-- Chọn ngày --'}
                  </option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{formatDate(d)}</option>
                  ))}
                </select>
                {showtimesLoading && (
                  <CircularProgress
                    size={14}
                    sx={{ position: 'absolute', right: 10, top: '50%', mt: '-7px', color: '#e50914' }}
                  />
                )}
              </div>
              <span className="qb-error">{missing('date') ? 'Vui lòng chọn ngày' : ''}</span>
            </div>

            {/* ── 4. Chọn Suất ───────────────────────────────────────────── */}
            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-showtime">Chọn Suất</label>
              <select
                id="qb-showtime"
                className={`qb-field__control ${missing('showtime') ? 'is-invalid' : ''}`}
                value={selectedShowtimeId}
                onChange={(e) => handleShowtimeChange(e.target.value)}
                disabled={!selectedDate || availableSlots.length === 0}
              >
                <option value="">
                  {!selectedDate
                    ? '-- Chọn ngày trước --'
                    : availableSlots.length === 0
                    ? '-- Không có suất --'
                    : '-- Chọn suất --'}
                </option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.time}{s.format ? ` · ${s.format}` : ''}{s.room ? ` · ${s.room}` : ''}
                  </option>
                ))}
              </select>
              <span className="qb-error">{missing('showtime') ? 'Vui lòng chọn suất' : ''}</span>
            </div>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            <div className="qb-field">
              <button
                type="submit"
                className="qb-submit"
                disabled={moviesLoading || theatersLoading || showtimesLoading}
              >
                <ConfirmationNumberRoundedIcon sx={{ fontSize: 20 }} />
                Đặt Vé Ngay
              </button>
              <span className="qb-error" />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickBooking;
