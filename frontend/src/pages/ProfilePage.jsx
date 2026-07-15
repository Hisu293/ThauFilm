import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import WcRoundedIcon from '@mui/icons-material/WcRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useAuth } from '../context/AuthContext';
import { profileUser, favoriteMovies } from '../data/profileMock';
import { useBooking } from '../hooks/useBooking';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { fetchMovies } from '../services/movieService';
import { MOCK_MOVIES } from '../mock/bookingData';
import { getPendingBooking, mergeMovieContext, mergeShowtimeContext } from '../utils/pendingBookingStorage';
import { buildMovieLookup, findMovie } from '../utils/movieLookup';
import { CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import './ProfilePage.css';

const MENU = [
  { key: 'info', label: 'Thông Tin Cá Nhân', Icon: PersonRoundedIcon },
  { key: 'history', label: 'Vé Của Tôi', Icon: ConfirmationNumberRoundedIcon },
];

const MEMBERSHIP_TIERS = [
  { name: 'V-Star', min: 0, next: 'V-Diamond', nextAt: 5000 },
  { name: 'V-Diamond', min: 5000, next: 'V-Platinum', nextAt: 10000 },
  { name: 'V-Platinum', min: 10000, next: null, nextAt: null },
];

const getMembership = (lifetimePoints = 0) => {
  const safePoints = Math.max(0, Number(lifetimePoints) || 0);
  const tier = [...MEMBERSHIP_TIERS].reverse().find((item) => safePoints >= item.min) || MEMBERSHIP_TIERS[0];
  const range = tier.nextAt ? tier.nextAt - tier.min : 1;
  return {
    tier: tier.name,
    nextTier: tier.next,
    pointsToNext: tier.nextAt ? Math.max(0, tier.nextAt - safePoints) : 0,
    progress: tier.nextAt ? Math.min(100, Math.round(((safePoints - tier.min) / range) * 100)) : 100,
  };
};

const STATUS_CLASS = {
  'Đã xem': 'is-done',
  'Đã hủy': 'is-cancel',
  'Sắp chiếu': 'is-upcoming',
  'Chờ thanh toán': 'is-pending',
};

const initialsOf = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getHoldRemaining = (holdExpiresAt, nowTs) => {
  const expiresAt = toValidDate(holdExpiresAt);
  if (!expiresAt) return { holdExpiresMs: 0, remainingMs: 0, remainingText: '' };

  const holdExpiresMs = expiresAt.getTime();
  const remainingMs = Math.max(0, holdExpiresMs - nowTs);
  const remainingTotalSeconds = Math.floor(remainingMs / 1000);
  const remainingText = `${String(Math.floor(remainingTotalSeconds / 60)).padStart(2, '0')}:${String(remainingTotalSeconds % 60).padStart(2, '0')}`;

  return { holdExpiresMs, remainingMs, remainingText };
};

const DEFAULT_TICKET_TITLE = 'Vé xem phim';
const isPendingTicket = (ticket) => (['PENDING', 'HOLD'].includes(ticket.rawStatus) || ticket.canResume) && !ticket.isExpired;
const isDoneTicket = (ticket) => ticket.rawStatus === 'CONFIRMED';
const isCancelTicket = (ticket) => ['CANCELLED', 'EXPIRED'].includes(ticket.rawStatus);

/* ─── Premium ticket card ─── */
const TicketCard = ({ ticket, onResume, onWatch }) => (
  <article className="pf-ticket">
    <div className="pf-ticket__left">
      <img
        className="pf-ticket__poster"
        src={ticket.poster}
        alt={`Poster phim ${ticket.movie}`}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/placeholder.svg';
        }}
      />
    </div>
    <div className="pf-ticket__body">
      <div className="pf-ticket__head">
        <div>
          <h4 className="pf-ticket__movie">{ticket.movie}</h4>
          <p className="pf-ticket__row"><PlaceRoundedIcon sx={{ fontSize: 15 }} />{ticket.cinema}</p>
        </div>
        <span className={`pf-badge ${STATUS_CLASS[ticket.status] || ''}`}>{ticket.status}</span>
      </div>
      <div className="pf-ticket__details">
        <div className="pf-ticket__detail">
          <span className="pf-ticket__detail-label">Suất chiếu</span>
          <span className="pf-ticket__detail-value"><ScheduleRoundedIcon sx={{ fontSize: 14 }} />{ticket.showtime}</span>
        </div>
        <div className="pf-ticket__detail">
          <span className="pf-ticket__detail-label">Ghế ngồi</span>
          <span className="pf-ticket__detail-value">
            {ticket.seats.map((s) => <span key={s} className="pf-seat">{s}</span>)}
          </span>
        </div>
        <div className="pf-ticket__detail">
          <span className="pf-ticket__detail-label">Ngày đặt</span>
          <span className="pf-ticket__detail-value">{ticket.bookedAt}</span>
        </div>
      </div>
      <div className="pf-ticket__footer">
        <div className="pf-ticket__footer-main">
          <span className="pf-ticket__code">{ticket.id}</span>
          {ticket.remainingText && (
            <span className={`pf-ticket__hold ${ticket.isExpired ? 'is-expired' : ''}`}>
              {ticket.isExpired ? 'Hết thời gian giữ ghế' : `Còn ${ticket.remainingText} để thanh toán`}
            </span>
          )}
        </div>
        {ticket.canResume ? (
          <button
            type="button"
            className="pf-btn pf-btn--sm pf-btn--pay"
            onClick={() => onResume(ticket)}
          >
            <ConfirmationNumberRoundedIcon sx={{ fontSize: 16 }} />
            Tiếp tục thanh toán
          </button>
        ) : ticket.rawStatus === 'CONFIRMED' && ticket.movieId ? (
          <button
            type="button"
            className="pf-btn pf-btn--sm pf-btn--pay"
            onClick={() => onWatch(ticket)}
          >
            <ConfirmationNumberRoundedIcon sx={{ fontSize: 16 }} />
            Xem phim online
          </button>
        ) : ticket.isExpired ? (
          <span className="pf-ticket__hold is-expired">Đã hết hạn giữ ghế</span>
        ) : (
          <div className="pf-ticket__barcode">
            {Array.from({ length: 28 }, (_, i) => (
              <span key={i} className="pf-ticket__bar" style={{ height: `${10 + (i * 7 + 13) % 18}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  </article>
);

/* ─── Toggle switch ─── */
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    className={`pf-toggle ${checked ? 'is-on' : ''}`}
    onClick={() => onChange(!checked)}
  />
);

/* ─── Settings section ─── */
const SettingsSection = ({ icon: Icon, title, children }) => (
  <div className="pf-settings-section">
    <div className="pf-settings-section__title">
      <Icon sx={{ fontSize: 20, color: '#e50914' }} />
      <span>{title}</span>
    </div>
    {children}
  </div>
);

const SettingsRow = ({ label, desc, action }) => (
  <div className="pf-settings-row">
    <div>
      <p className="pf-settings-row__label">{label}</p>
      {desc && <p className="pf-settings-row__desc">{desc}</p>}
    </div>
    <div className="pf-settings-row__action">{action}</div>
  </div>
);

/* ════════════════ PAGE ════════════════ */
const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = MENU.some((m) => m.key === searchParams.get('tab')) ? searchParams.get('tab') : 'info';
  const [active, setActive] = useState(initialTab);
  const [favorites, setFavorites] = useState(favoriteMovies);

  // Dynamic API state and side effects
  const { loading: apiLoading, getHistory, cancel } = useBooking();
  const [history, setHistory] = useState([]);
  const [subTab, setSubTab] = useState('all');
  const [nowTs, setNowTs] = useState(0);
  const [loyalty, setLoyalty] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [loyaltyError, setLoyaltyError] = useState('');

  useEffect(() => {
    Promise.resolve().then(() => setNowTs(Date.now()));
  }, []);

  useEffect(() => {
    let activeRequest = true;
    if (!user) return () => { activeRequest = false; };

    bookingApi.fetchLoyaltyOverview()
      .then((response) => {
        if (!activeRequest) return;
        setLoyalty(response?.data ?? response ?? null);
        setLoyaltyError('');
      })
      .catch((error) => {
        if (!activeRequest) return;
        setLoyalty(null);
        setLoyaltyError(error.message || 'Không thể tải điểm thưởng');
      })
      .finally(() => {
        if (activeRequest) setLoyaltyLoading(false);
      });

    return () => { activeRequest = false; };
  }, [user]);

  useEffect(() => {
    if (active !== 'history' && active !== 'upcoming') return undefined;

    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (active === 'history' || active === 'upcoming') {
      Promise.all([
        getHistory(),
        bookingApi.fetchShowtimes().catch(() => []),
        fetchMovies().catch(() => ({ movies: [] })),
      ])
        .then(([data, showtimeResponse, movieResponse]) => {
          const rawShowtimes = showtimeResponse?.data ?? showtimeResponse ?? [];
          const showtimeMap = new Map(
            bookingService.normalizeShowtimes(Array.isArray(rawShowtimes) ? rawShowtimes : [])
              .map((showtime) => [String(showtime.id), showtime]),
          );
          const movieLookup = buildMovieLookup(movieResponse?.movies || []);
          const now = Date.now();
          const mapped = data.map((b) => {
            const pendingContext = getPendingBooking(b.id);
            const showtimeInfo = showtimeMap.get(String(b.showtimeId));
            const pendingMovie = pendingContext?.movie || null;
            const pendingShowtime = pendingContext?.showtime || null;
            const mergedShowtime = mergeShowtimeContext(pendingShowtime, showtimeInfo);
            const rawStartTime = b.startTime || mergedShowtime?.startTime || '';
            const rawMovieTitle =
              b.movieTitle && b.movieTitle !== DEFAULT_TICKET_TITLE
                ? b.movieTitle
                : pendingMovie?.title || showtimeInfo?.movieTitle || DEFAULT_TICKET_TITLE;
            const rawRoomName = b.roomName && b.roomName !== 'Phòng chiếu' ? b.roomName : mergedShowtime?.room || 'Phòng chiếu';
            const date = toValidDate(rawStartTime);
            const isPast = date ? date < new Date() : false;
            const holdExpiresAt = pendingContext?.holdExpiresAt || b.holdExpiresAt;
            const { holdExpiresMs, remainingMs, remainingText } = getHoldRemaining(holdExpiresAt, now);
            const normStatus = String(b.status || '').toUpperCase();
            const isClosedBooking = normStatus === 'CANCELLED' || normStatus === 'EXPIRED' || normStatus === 'CONFIRMED';
            const hasPendingContext = Boolean(pendingContext?.bookingId) && !isClosedBooking;
            const isPending = normStatus === 'PENDING' || normStatus === 'HOLD' || hasPendingContext;
            const isExpired = isPending && holdExpiresMs > 0 && remainingMs <= 0;
            let displayStatus = 'Sắp chiếu';
            if (isPending) displayStatus = 'Chờ thanh toán';
            else if (normStatus === 'CANCELLED') displayStatus = 'Đã hủy';
            else if (normStatus === 'CONFIRMED' && isPast) displayStatus = 'Đã xem';
            else if (normStatus === 'EXPIRED') displayStatus = 'Đã hủy';

            const apiMovie = findMovie(
              movieLookup,
              b.movieId || showtimeInfo?.movieId || mergedShowtime?.movieId,
              rawMovieTitle,
            );
            const mockMovie = MOCK_MOVIES.find((m) =>
              m.title.toLowerCase().includes(rawMovieTitle.toLowerCase())
            );
            const mergedMovie = mergeMovieContext(
              {
                ...apiMovie,
                title: rawMovieTitle,
                posterUrl: apiMovie?.posterUrl || apiMovie?.poster || mockMovie?.posterUrl || '/placeholder.svg',
              },
              pendingMovie,
            );
            const poster = mergedMovie?.posterUrl || mergedMovie?.poster || '/placeholder.svg';
            const selectedSeats = (pendingContext?.selectedSeats?.length ? pendingContext.selectedSeats : b.seats) || [];

            return {
              id: b.confirmationCode || b.id,
              bookingId: b.id,
              movieId: b.movieId || showtimeInfo?.movieId || mergedShowtime?.movieId,
              movie: rawMovieTitle,
              poster,
              cinema: `ThauFilm Cinema • ${rawRoomName}`,
              showtime: date
                ? date.toLocaleString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Đang cập nhật',
              seats: selectedSeats.map((s) => s.label || s.seatLabel || s.name || s),
              bookedAt: isExpired ? 'Đã hủy' : (isPending ? 'Chờ thanh toán' : displayStatus),
              status: isExpired ? 'Đã hủy' : displayStatus,
              rawStatus: isExpired ? 'EXPIRED' : (isPending ? 'PENDING' : normStatus),
              startTime: date,
              holdExpiresAt,
              remainingText: isPending && holdExpiresMs > 0 ? remainingText : '',
              isExpired,
              canResume: isPending && !isExpired,
              moviePayload: {
                ...mergedMovie,
                id: b.movieId || showtimeInfo?.movieId || mergedShowtime?.movieId,
                movieId: b.movieId || showtimeInfo?.movieId || mergedShowtime?.movieId,
                title: rawMovieTitle,
                posterUrl: poster,
              },
              showtimePayload: {
                id: b.showtimeId,
                date: rawStartTime ? String(rawStartTime).slice(0, 10) : '',
                time: rawStartTime ? String(rawStartTime).slice(11, 16) : '',
                room: rawRoomName,
                format: mergedShowtime?.format || '2D',
                startTime: rawStartTime,
                movieId: b.movieId || showtimeInfo?.movieId || mergedShowtime?.movieId,
              },
              selectedSeats,
            };
          });
          setHistory(mapped);
          mapped
            .filter((ticket) => ticket.isExpired && ['PENDING', 'HOLD'].includes(ticket.rawStatus))
            .forEach((ticket) => {
              cancel(ticket.bookingId).catch(() => {});
            });
        })
        .catch(() => {});
    }
  }, [active, cancel, getHistory]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setHistory((current) => current.map((ticket) => {
        if (!ticket.holdExpiresAt || !['PENDING', 'HOLD'].includes(ticket.rawStatus)) return ticket;

        const { holdExpiresMs, remainingMs, remainingText } = getHoldRemaining(ticket.holdExpiresAt, nowTs);
        const isExpired = holdExpiresMs > 0 && remainingMs <= 0;

        return {
          ...ticket,
          remainingText,
          isExpired,
          status: isExpired ? 'Đã hủy' : ticket.status,
          bookedAt: isExpired ? 'Đã hủy' : ticket.bookedAt,
          rawStatus: isExpired ? 'EXPIRED' : ticket.rawStatus,
          canResume: !isExpired,
        };
      }));
    });
  }, [nowTs]);

  const filteredHistory = history.filter((t) => {
    if (subTab === 'pending') return isPendingTicket(t);
    if (subTab === 'done') return isDoneTicket(t);
    if (subTab === 'cancel') return isCancelTicket(t);
    return true;
  });

  /* settings state */
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifUpcoming, setNotifUpcoming] = useState(true);
  const [lang, setLang] = useState('vi');
  const [autoPlay, setAutoPlay] = useState(true);
  const [adultContent, setAdultContent] = useState(false);

  const membership = useMemo(() => getMembership(loyalty?.lifetimeEarned), [loyalty?.lifetimeEarned]);
  const data = useMemo(
    () => ({
      ...profileUser,
      name: user?.name || profileUser.name,
      email: user?.email || profileUser.email,
      points: Math.max(0, Number(loyalty?.pointsBalance) || 0),
      lifetimeEarned: Math.max(0, Number(loyalty?.lifetimeEarned) || 0),
      tier: membership.tier,
    }),
    [loyalty, membership.tier, user]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const removeFavorite = (id) => setFavorites((list) => list.filter((m) => m.id !== id));
  const resumePayment = () => {
    navigate('/my-bookings');
  };
  const watchOnline = (ticket) => {
    if (ticket?.movieId) navigate(`/movies/${ticket.movieId}?watch=1`);
  };

  const MembershipCard = (
    <div className="pf-card pf-membership">
      <div className="pf-membership__top">
        <div>
          <span className="pf-membership__label"><WorkspacePremiumRoundedIcon sx={{ fontSize: 18 }} /> Hạng thành viên</span>
          <h3 className="pf-membership__tier">{data.tier}</h3>
        </div>
        <div className="pf-membership__points">
          <span>{loyaltyLoading ? '...' : data.points.toLocaleString('vi-VN')}</span>
          <small>điểm khả dụng</small>
        </div>
      </div>
      <div className="pf-progress">
        <div className="pf-progress__bar" style={{ width: `${membership.progress}%` }} />
      </div>
      <p className="pf-membership__hint">
        {loyaltyError ? (
          <span className="pf-membership__error">{loyaltyError}</span>
        ) : membership.nextTier ? (
          <>Đã tích <b>{data.lifetimeEarned.toLocaleString('vi-VN')}</b> điểm · Còn <b>{membership.pointsToNext.toLocaleString('vi-VN')}</b> điểm để lên hạng <b>{membership.nextTier}</b></>
        ) : (
          <>Bạn đang ở hạng thành viên cao nhất với <b>{data.lifetimeEarned.toLocaleString('vi-VN')}</b> điểm đã tích.</>
        )}
      </p>
      <button type="button" className="pf-membership__redeem" onClick={() => navigate('/promotions')}>
        Đổi điểm nhận quà
      </button>
    </div>
  );

  return (
    <div className="pf-page">
      <div className="pf-container">
        {/* ── Sidebar ── */}
        <aside className="pf-sidebar">
          <div className="pf-card pf-user">
            <div className="pf-avatar">
              {data.avatar ? <img src={data.avatar} alt={data.name} /> : initialsOf(data.name)}
            </div>
            <h3 className="pf-user__name">{data.name}</h3>
            <span className="pf-user__tier"><WorkspacePremiumRoundedIcon sx={{ fontSize: 15 }} />{data.tier}</span>
            <div className="pf-user__points">
              <StarRoundedIcon sx={{ fontSize: 18, color: '#ffce3a' }} />
              {loyaltyLoading ? 'Đang tải điểm...' : loyaltyError ? 'Chưa tải được điểm' : `${data.points.toLocaleString('vi-VN')} điểm`}
            </div>
          </div>

          <nav className="pf-card pf-menu">
            {MENU.map(({ key, label, Icon }) => (
              <button key={key} type="button" className={`pf-menu__item ${active === key ? 'is-active' : ''}`} onClick={() => setActive(key)}>
                <Icon sx={{ fontSize: 20 }} />
                {label}
              </button>
            ))}
            <button type="button" className="pf-menu__item pf-menu__item--logout" onClick={handleLogout}>
              <LogoutRoundedIcon sx={{ fontSize: 20 }} />
              Đăng Xuất
            </button>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="pf-main">

          {/* ── THÔNG TIN CÁ NHÂN ── */}
          {active === 'info' && (
            <>
              <div className="pf-card">
                <h2 className="pf-section__title">Thông tin cá nhân</h2>
                <div className="pf-info-grid">
                  <div className="pf-info"><span className="pf-info__k"><PersonRoundedIcon sx={{ fontSize: 17 }} />Họ và tên</span><span className="pf-info__v">{data.name}</span></div>
                  <div className="pf-info"><span className="pf-info__k"><EmailRoundedIcon sx={{ fontSize: 17 }} />Email</span><span className="pf-info__v">{data.email}</span></div>
                  <div className="pf-info"><span className="pf-info__k"><PhoneRoundedIcon sx={{ fontSize: 17 }} />Số điện thoại</span><span className="pf-info__v">{data.phone}</span></div>
                  <div className="pf-info"><span className="pf-info__k"><CakeRoundedIcon sx={{ fontSize: 17 }} />Ngày sinh</span><span className="pf-info__v">{formatDate(data.birthday)}</span></div>
                  <div className="pf-info"><span className="pf-info__k"><WcRoundedIcon sx={{ fontSize: 17 }} />Giới tính</span><span className="pf-info__v">{data.gender}</span></div>
                </div>
                <button type="button" className="pf-btn">Chỉnh sửa thông tin</button>
              </div>
              {MembershipCard}
            </>
          )}

          {/* ── VÉ CỦA TÔI ── */}
          {active === 'history' && (
            <div className="pf-card">
              <div className="pf-section-header">
                <h2 className="pf-section__title">Vé của tôi</h2>
                <div className="pf-tabs">
                  <span
                    className={`pf-tab ${subTab === 'all' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('all')}
                    style={{ cursor: 'pointer' }}
                  >
                    Tất cả ({history.length})
                  </span>
                  <span
                    className={`pf-tab ${subTab === 'pending' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('pending')}
                    style={{ cursor: 'pointer' }}
                  >
                    {history.filter(isPendingTicket).length} Chờ thanh toán
                  </span>
                  <span
                    className={`pf-tab ${subTab === 'done' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('done')}
                    style={{ cursor: 'pointer' }}
                  >
                    {history.filter(isDoneTicket).length} Đã xem
                  </span>
                  <span 
                    className={`pf-tab ${subTab === 'cancel' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('cancel')}
                    style={{ cursor: 'pointer' }}
                  >
                    {history.filter(isCancelTicket).length} Đã hủy
                  </span>
                </div>
              </div>
              {apiLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              ) : filteredHistory.length ? (
                <div className="pf-tickets">
                  {filteredHistory.map((t) => <TicketCard key={t.id} ticket={t} onResume={resumePayment} onWatch={watchOnline} />)}
                </div>
              ) : (
                <div className="pf-empty-state" style={{ minHeight: 200 }}>
                  <EventSeatRoundedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }} />
                  <p>Không tìm thấy lịch sử đặt vé nào phù hợp.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PHIM ĐÃ LƯU ── */}
          {active === 'favorites' && (
            <div className="pf-card">
              <div className="pf-section-header">
                <h2 className="pf-section__title">Phim đã lưu</h2>
                <span className="pf-count">{favorites.length} phim</span>
              </div>
              {favorites.length ? (
                <div className="pf-fav-grid">
                  {favorites.map((m) => (
                    <article key={m.id} className="pf-fav">
                      <div className="pf-fav__media">
                        <img src={m.poster} alt={m.title} loading="lazy" />
                        <div className="pf-fav__overlay">
                          <button
                            type="button"
                            className="pf-fav__remove"
                            aria-label="Bỏ yêu thích"
                            onClick={() => removeFavorite(m.id)}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 15 }} />
                            Bỏ lưu
                          </button>
                          <button
                            type="button"
                            className="pf-fav__book"
                            onClick={() => navigate(`/movies/${m.id}?book=1`)}
                          >
                            <ConfirmationNumberRoundedIcon sx={{ fontSize: 15 }} />
                            Đặt vé
                          </button>
                        </div>
                        <span className="pf-fav__rating"><StarRoundedIcon sx={{ fontSize: 13 }} />{m.rating}</span>
                        <FavoriteBorderRoundedIcon className="pf-fav__heart" sx={{ fontSize: 18 }} />
                      </div>
                      <div className="pf-fav__body">
                        <h4>{m.title}</h4>
                        <span className="pf-fav__genre">{m.genre}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="pf-empty-state">
                  <FavoriteRoundedIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.15)' }} />
                  <p>Chưa có phim yêu thích nào.</p>
                  <button type="button" className="pf-btn" onClick={() => navigate('/movies')}>Khám phá phim</button>
                </div>
              )}
            </div>
          )}

          {/* ── ĐỔI MẬT KHẨU ── */}
          {active === 'password' && (
            <div className="pf-card">
              <h2 className="pf-section__title">Đổi mật khẩu</h2>
              <form className="pf-form" onSubmit={(e) => e.preventDefault()}>
                <label>Mật khẩu hiện tại<input type="password" placeholder="••••••••" /></label>
                <label>Mật khẩu mới<input type="password" placeholder="••••••••" /></label>
                <label>Xác nhận mật khẩu mới<input type="password" placeholder="••••••••" /></label>
                <button type="submit" className="pf-btn">Cập nhật mật khẩu</button>
              </form>
            </div>
          )}

          {/* ── THÔNG BÁO ── */}
          {active === 'notifications' && (
            <div className="pf-card">
              <h2 className="pf-section__title">Thông báo</h2>
              <p className="pf-empty">Bạn chưa có thông báo mới.</p>
            </div>
          )}

          {/* ── CÀI ĐẶT ── */}
          {active === 'settings' && (
            <div className="pf-settings">
              <div className="pf-card">
                <h2 className="pf-section__title">Cài đặt</h2>

                <SettingsSection icon={NotificationsActiveRoundedIcon} title="Thông báo">
                  <SettingsRow
                    label="Thông báo qua Email"
                    desc="Nhận email về vé, lịch chiếu và khuyến mãi"
                    action={<Toggle checked={notifEmail} onChange={setNotifEmail} />}
                  />
                  <SettingsRow
                    label="Thông báo đẩy (Push)"
                    desc="Nhận thông báo ngay trên trình duyệt"
                    action={<Toggle checked={notifPush} onChange={setNotifPush} />}
                  />
                  <SettingsRow
                    label="Thông báo khuyến mãi"
                    desc="Nhận ưu đãi độc quyền và mã giảm giá"
                    action={<Toggle checked={notifPromo} onChange={setNotifPromo} />}
                  />
                  <SettingsRow
                    label="Nhắc vé sắp chiếu"
                    desc="Nhắc trước 2 giờ khi có suất chiếu sắp tới"
                    action={<Toggle checked={notifUpcoming} onChange={setNotifUpcoming} />}
                  />
                </SettingsSection>

                <SettingsSection icon={PaletteRoundedIcon} title="Giao diện & Ngôn ngữ">
                  <SettingsRow
                    label="Ngôn ngữ"
                    desc="Chọn ngôn ngữ hiển thị của ứng dụng"
                    action={
                      <select className="pf-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    }
                  />
                  <SettingsRow
                    label="Tự động phát trailer"
                    desc="Tự động phát trailer khi di chuột vào poster phim"
                    action={<Toggle checked={autoPlay} onChange={setAutoPlay} />}
                  />
                </SettingsSection>

                <SettingsSection icon={SecurityRoundedIcon} title="Bảo mật & Quyền riêng tư">
                  <SettingsRow
                    label="Hiển thị nội dung 18+"
                    desc="Cho phép hiển thị phim dành cho người lớn"
                    action={<Toggle checked={adultContent} onChange={setAdultContent} />}
                  />
                  <SettingsRow
                    label="Xác thực 2 bước (2FA)"
                    desc="Bảo vệ tài khoản với mã OTP qua điện thoại"
                    action={<button type="button" className="pf-btn pf-btn--sm">Bật 2FA</button>}
                  />
                  <SettingsRow
                    label="Phiên đăng nhập"
                    desc="Quản lý các thiết bị đang đăng nhập tài khoản"
                    action={<button type="button" className="pf-btn pf-btn--sm pf-btn--ghost">Xem phiên</button>}
                  />
                </SettingsSection>

                <SettingsSection icon={DeleteOutlineRoundedIcon} title="Tài khoản">
                  <SettingsRow
                    label="Xuất dữ liệu"
                    desc="Tải xuống toàn bộ dữ liệu tài khoản của bạn"
                    action={<button type="button" className="pf-btn pf-btn--sm pf-btn--ghost">Xuất</button>}
                  />
                  <SettingsRow
                    label="Xóa tài khoản"
                    desc="Hành động này không thể khôi phục"
                    action={<button type="button" className="pf-btn pf-btn--sm pf-btn--danger">Xóa tài khoản</button>}
                  />
                </SettingsSection>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
