import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded';
import Instagram from '@mui/icons-material/Instagram';
import YouTube from '@mui/icons-material/YouTube';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AppleIcon from '@mui/icons-material/Apple';
import ShopRoundedIcon from '@mui/icons-material/ShopRounded';
import useRevealOnScroll from '../../hooks/useRevealOnScroll';
import './SiteFooter.css';

const QUICK_LINKS = [
  { label: 'Trang Chủ', to: '/' },
  { label: 'Phim', to: '/movies' },
  { label: 'Rạp Chiếu', to: '/cinemas' },
  { label: 'Lịch Chiếu', to: '/movies' },
  { label: 'Khuyến Mãi', to: '/promotions' },
  { label: 'Liên Hệ', to: '/contact' },
];

const SUPPORT_LINKS = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Điều Khoản Sử Dụng', to: '/terms' },
  { label: 'Chính Sách Bảo Mật', to: '/privacy' },
  { label: 'Chính Sách Hoàn Vé', to: '/refund' },
];

const SOCIALS = [
  { label: 'Facebook', Icon: FacebookRoundedIcon, href: 'https://facebook.com' },
  { label: 'Instagram', Icon: Instagram, href: 'https://instagram.com' },
  { label: 'Youtube', Icon: YouTube, href: 'https://youtube.com' },
  { label: 'Tiktok', Icon: MusicNoteRoundedIcon, href: 'https://tiktok.com' },
];

const SiteFooter = () => {
  const { ref, visible } = useRevealOnScroll();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <footer ref={ref} className={`site-footer ${visible ? 'is-visible' : ''}`}>
      <div className="site-footer__glow" />
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="footer-col footer-col--brand">
            <RouterLink to="/" className="footer-brand">
              <img src="/logo-removebg-preview.png" alt="ThauFilm" className="footer-brand__logo" />
              <span>ThauFilm</span>
            </RouterLink>
            <p className="footer-brand__desc">
              Nền tảng đặt vé xem phim cao cấp — trải nghiệm điện ảnh đỉnh cao, ghế ngồi thời gian thực và ưu đãi độc quyền cho thành viên.
            </p>
            <div className="footer-apps">
              <a href="#" className="footer-app">
                <AppleIcon sx={{ fontSize: 24 }} />
                <span><small>Tải về trên</small>App Store</span>
              </a>
              <a href="#" className="footer-app">
                <ShopRoundedIcon sx={{ fontSize: 24 }} />
                <span><small>Tải về trên</small>Google Play</span>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col__title">Liên Kết Nhanh</h4>
            <ul className="footer-links">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}><RouterLink to={l.to}>{l.label}</RouterLink></li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col__title">Hỗ Trợ</h4>
            <ul className="footer-links">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.label}><RouterLink to={l.to}>{l.label}</RouterLink></li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col__title">Liên Hệ</h4>
            <ul className="footer-contact">
              <li><PlaceRoundedIcon sx={{ fontSize: 18 }} />3/9 Võ Văn Tấn, P. Xuân Hòa, TP. Hồ Chí Minh</li>
              <li><PhoneRoundedIcon sx={{ fontSize: 18 }} /><a href="tel:1900222">1900 2224 (9:00 - 22:00)</a></li>
              <li><EmailRoundedIcon sx={{ fontSize: 18 }} /><a href="mailto:support@thaufilm.com">support@thaufilm.com</a></li>
            </ul>
          </div>

          <div className="footer-col footer-col--news">
            <h4 className="footer-col__title">Đăng Ký Nhận Tin</h4>
            <p className="footer-news__desc">Nhận thông báo phim mới &amp; ưu đãi sớm nhất.</p>
            <form className="footer-news" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email đăng ký nhận tin"
              />
              <button type="submit" aria-label="Đăng ký"><SendRoundedIcon sx={{ fontSize: 18 }} /></button>
            </form>
            {subscribed && <span className="footer-news__ok">Đăng ký thành công!</span>}

            <h4 className="footer-col__title" style={{ marginTop: 22 }}>Kết Nối</h4>
            <div className="footer-socials">
              {SOCIALS.map(({ label, Icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="footer-social" aria-label={label} title={label}>
                  <Icon sx={{ fontSize: 20 }} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="site-footer__divider" />

        <div className="site-footer__bottom">
          <p>© {2026} ThauFilm. Bản quyền thuộc Công ty Cổ phần Phim ThauFilm.</p>
          <div className="site-footer__legal">
            <RouterLink to="/terms">Điều khoản</RouterLink>
            <span>•</span>
            <RouterLink to="/privacy">Bảo mật</RouterLink>
            <span>•</span>
            <RouterLink to="/cookie">Cookie</RouterLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
