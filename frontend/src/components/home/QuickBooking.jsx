import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import LocalActivityRoundedIcon from '@mui/icons-material/LocalActivityRounded';
import { cinemas, SHOWTIMES } from '../../data/cinemas';
import './QuickBooking.css';

const todayStr = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

const QuickBooking = ({ movies = [], loading = false }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ movie: '', cinema: '', date: '', showtime: '' });
  const [touched, setTouched] = useState(false);
  const minDate = useMemo(() => todayStr(), []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const missing = (key) => touched && !form[key];

  const isEmpty = !loading && movies.length === 0;
  const disabled = loading || isEmpty;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!form.movie || !form.cinema || !form.date || !form.showtime) return;
    const params = new URLSearchParams({
      cinema: form.cinema,
      date: form.date,
      showtime: form.showtime,
      book: '1',
    });
    navigate(`/movies/${form.movie}?${params.toString()}`);
  };

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
            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-movie">Chọn Phim</label>
              <select id="qb-movie" className={`qb-field__control ${missing('movie') ? 'is-invalid' : ''}`} value={form.movie} onChange={set('movie')} disabled={disabled}>
                <option value="">{loading ? 'Đang tải…' : '-- Chọn phim --'}</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <span className="qb-error">{missing('movie') ? 'Vui lòng chọn phim' : ''}</span>
            </div>

            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-cinema">Chọn Rạp</label>
              <select id="qb-cinema" className={`qb-field__control ${missing('cinema') ? 'is-invalid' : ''}`} value={form.cinema} onChange={set('cinema')} disabled={disabled}>
                <option value="">-- Chọn rạp --</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="qb-error">{missing('cinema') ? 'Vui lòng chọn rạp' : ''}</span>
            </div>

            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-date">Chọn Ngày</label>
              <input id="qb-date" type="date" min={minDate} className={`qb-field__control ${missing('date') ? 'is-invalid' : ''}`} value={form.date} onChange={set('date')} disabled={disabled} />
              <span className="qb-error">{missing('date') ? 'Vui lòng chọn ngày' : ''}</span>
            </div>

            <div className="qb-field">
              <label className="qb-field__label" htmlFor="qb-showtime">Chọn Suất</label>
              <select id="qb-showtime" className={`qb-field__control ${missing('showtime') ? 'is-invalid' : ''}`} value={form.showtime} onChange={set('showtime')} disabled={disabled}>
                <option value="">-- Chọn suất --</option>
                {SHOWTIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="qb-error">{missing('showtime') ? 'Vui lòng chọn suất' : ''}</span>
            </div>

            <div className="qb-field">
              <button type="submit" className="qb-submit" disabled={disabled}>
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
