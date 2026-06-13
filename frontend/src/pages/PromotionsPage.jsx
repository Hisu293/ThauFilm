import { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import './PromotionsPage.css';

const FILTERS = ['Tất cả', 'Thành viên', 'Thanh toán', 'Combo bắp nước', 'Học sinh - Sinh viên'];

const PROMOS = [
  {
    id: 1,
    tag: 'HOT',
    category: 'Thành viên',
    title: 'Thứ 3 vui vẻ - Đồng giá 50K',
    desc: 'Mọi suất chiếu 2D trong ngày thứ Ba chỉ còn 50.000đ cho thành viên ThauFilm.',
    image: '/listfilm/film2.jpg',
    code: 'TUESDAY50',
    expiry: '31/12/2026',
  },
  {
    id: 2,
    category: 'Thanh toán',
    title: 'Giảm 30% khi thanh toán qua ví điện tử',
    desc: 'Áp dụng cho giao dịch đầu tiên qua MoMo, ZaloPay. Tối đa 40.000đ.',
    image: '/listfilm/film6.jpg',
    code: 'EWALLET30',
    expiry: '30/09/2026',
  },
  {
    id: 3,
    category: 'Combo bắp nước',
    title: 'Combo 2 bắp + 2 nước chỉ 99K',
    desc: 'Đậm vị điện ảnh với combo bắp rang bơ size lớn và nước ngọt mát lạnh.',
    image: '/listfilm/film10.jpg',
    code: 'COMBO99',
    expiry: '15/08/2026',
  },
  {
    id: 4,
    tag: 'MỚI',
    category: 'Học sinh - Sinh viên',
    title: 'Ưu đãi HSSV - Giảm 25% mọi suất',
    desc: 'Xuất trình thẻ học sinh/sinh viên để nhận ngay ưu đãi 25% giá vé.',
    image: '/listfilm/film13.jpg',
    code: 'STUDENT25',
    expiry: '31/12/2026',
  },
  {
    id: 5,
    category: 'Thành viên',
    title: 'Tặng vé sinh nhật cho thành viên VIP',
    desc: 'Thành viên hạng VIP nhận 1 vé xem phim miễn phí trong tháng sinh nhật.',
    image: '/listfilm/film15.jpg',
    code: 'BIRTHDAY',
    expiry: 'Không thời hạn',
  },
  {
    id: 6,
    category: 'Thanh toán',
    title: 'Hoàn 15% khi đặt 4 vé trở lên',
    desc: 'Đặt nhóm từ 4 vé cho một suất chiếu để nhận hoàn tiền 15% vào ví ThauFilm.',
    image: '/listfilm/film8.jpg',
    code: 'GROUP15',
    expiry: '30/11/2026',
  },
];

const PromotionsPage = () => {
  const [filter, setFilter] = useState('Tất cả');
  const [copied, setCopied] = useState(null);

  const visible = filter === 'Tất cả' ? PROMOS : PROMOS.filter((p) => p.category === filter);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
  };

  return (
    <Box sx={{ color: '#fff', pb: 8 }}>
      <div className="promo-hero">
        <div className="promo-hero__inner">
          <Typography variant="overline" sx={{ color: '#e50914', fontWeight: 800, letterSpacing: '0.12em' }}>
            ƯU ĐÃI ĐỘC QUYỀN
          </Typography>
          <h1 className="promo-hero__title">Khuyến mãi &amp; Ưu đãi</h1>
          <p className="promo-hero__sub">Săn mã giảm giá, combo bắp nước và đặc quyền thành viên ThauFilm.</p>
        </div>
      </div>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <div className="promo-filters">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`promo-filter ${f === filter ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.6)' }}>
            Chưa có ưu đãi trong nhóm này.
          </Typography>
        ) : (
          <div className="promo-grid">
            {visible.map((p) => (
              <article key={p.id} className="promo-card">
                <div className="promo-card__media">
                  <img src={p.image} alt={p.title} loading="lazy" />
                  {p.tag && <span className="promo-card__tag">{p.tag}</span>}
                  <span className="promo-card__cat"><LocalOfferRoundedIcon sx={{ fontSize: 14 }} />{p.category}</span>
                </div>
                <div className="promo-card__body">
                  <h3 className="promo-card__title">{p.title}</h3>
                  <p className="promo-card__desc">{p.desc}</p>
                  <div className="promo-card__footer">
                    <button type="button" className="promo-code" onClick={() => copyCode(p.code)}>
                      <span>{p.code}</span>
                      {copied === p.code ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                    </button>
                    <span className="promo-expiry">HSD: {p.expiry}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </Box>
  );
};

export default PromotionsPage;
