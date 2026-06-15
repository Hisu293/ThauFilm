import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
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
import { profileUser, bookingHistory, upcomingTickets, favoriteMovies } from '../data/profileMock';
import { useBooking } from '../hooks/useBooking';
import { MOCK_MOVIES } from '../mock/bookingData';
import { CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import './ProfilePage.css';

const MENU = [
  { key: 'info', label: 'Thông Tin Cá Nhân', Icon: PersonRoundedIcon },
  { key: 'history', label: 'Vé Của Tôi', Icon: ConfirmationNumberRoundedIcon },
  { key: 'upcoming', label: 'Vé Sắp Chiếu', Icon: EventSeatRoundedIcon },
  { key: 'favorites', label: 'Phim Đã Lưu', Icon: FavoriteRoundedIcon },
  { key: 'password', label: 'Đổi Mật Khẩu', Icon: LockRoundedIcon },
  { key: 'notifications', label: 'Thông Báo', Icon: NotificationsRoundedIcon },
  { key: 'settings', label: 'Cài Đặt', Icon: SettingsRoundedIcon },
];

const STATUS_CLASS = {
  'Đã xem': 'is-done',
  'Đã hủy': 'is-cancel',
  'Sắp chiếu': 'is-upcoming',
};

const initialsOf = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/* ─── Premium ticket card ─── */
const TicketCard = ({ ticket }) => (
  <article className="pf-ticket">
    <div className="pf-ticket__left">
      <img className="pf-ticket__poster" src={ticket.poster} alt={ticket.movie} loading="lazy" />
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
        <span className="pf-ticket__code">{ticket.id}</span>
        <div className="pf-ticket__barcode">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="pf-ticket__bar" style={{ height: `${10 + (i * 7 + 13) % 18}px` }} />
          ))}
        </div>
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
  const { loading: apiLoading, getHistory } = useBooking();
  const [history, setHistory] = useState([]);
  const [subTab, setSubTab] = useState('all');

  useEffect(() => {
    if (active === 'history' || active === 'upcoming') {
      getHistory()
        .then((data) => {
          const mapped = data.map((b) => {
            const date = new Date(b.startTime);
            const isPast = date < new Date();
            let displayStatus = 'Sắp chiếu';
            if (b.status === 'CANCELLED') displayStatus = 'Đã hủy';
            else if (b.status === 'CONFIRMED' && isPast) displayStatus = 'Đã xem';
            else if (b.status === 'PENDING') displayStatus = 'Chờ thanh toán';

            // Lookup mock movie details to retrieve the correct image URL
            const mockMovie = MOCK_MOVIES.find((m) =>
              m.title.toLowerCase().includes(b.movieTitle.toLowerCase())
            );
            const poster = mockMovie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop';

            return {
              id: b.confirmationCode || b.id,
              movie: b.movieTitle,
              poster,
              cinema: `ThauFilm Cinema • ${b.roomName}`,
              showtime: date.toLocaleString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              seats: b.seats.map((s) => s.label),
              bookedAt: b.status === 'CONFIRMED' ? 'Đã thanh toán' : 'Chờ thanh toán',
              status: displayStatus,
              rawStatus: b.status,
              startTime: date
            };
          });
          setHistory(mapped);
        })
        .catch(() => {});
    }
  }, [active, getHistory]);

  const filteredHistory = history.filter((t) => {
    if (subTab === 'done') return t.status === 'Đã xem';
    if (subTab === 'cancel') return t.status === 'Đã hủy';
    return true;
  });

  const upcomingList = history.filter(
    (t) => t.status === 'Sắp chiếu' || t.status === 'Chờ thanh toán'
  );

  /* settings state */
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifUpcoming, setNotifUpcoming] = useState(true);
  const [lang, setLang] = useState('vi');
  const [autoPlay, setAutoPlay] = useState(true);
  const [adultContent, setAdultContent] = useState(false);

  const data = useMemo(
    () => ({
      ...profileUser,
      name: user?.name || profileUser.name,
      email: user?.email || profileUser.email,
    }),
    [user]
  );

  const progress = Math.min(100, Math.round((data.points / data.nextTierAt) * 100));
  const pointsToNext = Math.max(0, data.nextTierAt - data.points);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const removeFavorite = (id) => setFavorites((list) => list.filter((m) => m.id !== id));

  const MembershipCard = (
    <div className="pf-card pf-membership">
      <div className="pf-membership__top">
        <div>
          <span className="pf-membership__label"><WorkspacePremiumRoundedIcon sx={{ fontSize: 18 }} /> Hạng thành viên</span>
          <h3 className="pf-membership__tier">{data.tier}</h3>
        </div>
        <div className="pf-membership__points">
          <span>{data.points.toLocaleString('vi-VN')}</span>
          <small>điểm tích lũy</small>
        </div>
      </div>
      <div className="pf-progress">
        <div className="pf-progress__bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="pf-membership__hint">
        Còn <b>{pointsToNext.toLocaleString('vi-VN')}</b> điểm để lên hạng <b>{data.nextTier}</b>
      </p>
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
              {data.points.toLocaleString('vi-VN')} điểm
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
                    className={`pf-tab ${subTab === 'done' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('done')}
                    style={{ cursor: 'pointer' }}
                  >
                    {history.filter(t => t.status === 'Đã xem').length} Đã xem
                  </span>
                  <span 
                    className={`pf-tab ${subTab === 'cancel' ? 'is-active' : ''}`}
                    onClick={() => setSubTab('cancel')}
                    style={{ cursor: 'pointer' }}
                  >
                    {history.filter(t => t.status === 'Đã hủy').length} Đã hủy
                  </span>
                </div>
              </div>
              {apiLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              ) : filteredHistory.length ? (
                <div className="pf-tickets">
                  {filteredHistory.map((t) => <TicketCard key={t.id} ticket={t} />)}
                </div>
              ) : (
                <div className="pf-empty-state" style={{ minHeight: 200 }}>
                  <EventSeatRoundedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }} />
                  <p>Không tìm thấy lịch sử đặt vé nào phù hợp.</p>
                </div>
              )}
            </div>
          )}

          {/* ── VÉ SẮP CHIẾU ── */}
          {active === 'upcoming' && (
            <div className="pf-card">
              <h2 className="pf-section__title">Vé sắp chiếu</h2>
              {apiLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              ) : upcomingList.length ? (
                <div className="pf-tickets">
                  {upcomingList.map((t) => <TicketCard key={t.id} ticket={t} />)}
                </div>
              ) : (
                <div className="pf-empty-state">
                  <EventSeatRoundedIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.15)' }} />
                  <p>Bạn chưa có vé nào sắp chiếu.</p>
                  <button type="button" className="pf-btn" onClick={() => navigate('/movies')}>Đặt vé ngay</button>
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
