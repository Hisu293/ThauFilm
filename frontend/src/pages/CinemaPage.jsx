import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import api from '../services/api';
import { cinemas as fallbackCinemas } from '../data/cinemas';
import './CinemaPage.css';

const CinemaPage = () => {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [brand, setBrand] = useState('Tất cả');
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/api/theaters')
      .then((response) => {
        const data = response?.data?.data ?? response?.data ?? [];
        if (!active) return;
        setCinemas(Array.isArray(data) ? data.map((theater) => ({
          id: theater.id,
          name: theater.name || 'Rạp không tên',
          brand: (theater.name || 'Rạp').split(/\s+/)[0],
          city: theater.city || 'Khác',
          address: theater.address || 'Đang cập nhật địa chỉ',
          image: theater.imageUrl || '/placeholder.svg',
          screens: theater.roomCount ?? 0,
          openingHours: '09:00 - 23:00',
          facilities: [],
        })) : []);
      })
      .catch(() => {
        if (active) setCinemas(fallbackCinemas);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const cities = useMemo(() => ['Tất cả', ...new Set(cinemas.map((cinema) => cinema.city).filter(Boolean))], [cinemas]);
  const brands = useMemo(() => ['Tất cả', ...new Set(cinemas.map((cinema) => cinema.brand).filter(Boolean))], [cinemas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cinemas.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.address.toLowerCase().includes(q)) return false;
      if (city !== 'Tất cả' && c.city !== city) return false;
      if (brand !== 'Tất cả' && c.brand !== brand) return false;
      return true;
    });
  }, [cinemas, query, city, brand]);

  return (
    <Box sx={{ color: '#fff', pb: 8 }}>
      <div className="cinema-hero">
        <div className="cinema-hero__inner">
          <Typography variant="overline" sx={{ color: '#e50914', fontWeight: 800, letterSpacing: '0.12em' }}>
            HỆ THỐNG RẠP
          </Typography>
          <h1 className="cinema-hero__title">Tìm rạp chiếu gần bạn</h1>
          <p className="cinema-hero__sub">CGV, Galaxy, Lotte, Beta, BHD Star — trải nghiệm điện ảnh đỉnh cao trên toàn quốc.</p>
        </div>
      </div>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <div className="cinema-toolbar">
          <div className="cinema-search">
            <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <input placeholder="Tìm rạp theo tên hoặc địa chỉ…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="cinema-filters">
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => <option key={c} value={c}>{c === 'Tất cả' ? 'Thành phố' : c}</option>)}
            </select>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              {brands.map((b) => <option key={b} value={b}>{b === 'Tất cả' ? 'Thương hiệu' : b}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="error" /></Box>
        ) : filtered.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.6)' }}>
            Không tìm thấy rạp phù hợp.
          </Typography>
        ) : (
          <div className="cinema-grid">
            {filtered.map((c) => (
              <article key={c.id} className="cinema-card">
                <div className="cinema-card__media">
                  <img src={c.image} alt={c.name} loading="lazy" />
                  <span className="cinema-card__brand">{c.brand}</span>
                </div>
                <div className="cinema-card__body">
                  <h3 className="cinema-card__name">{c.name}</h3>
                  <p className="cinema-card__row"><PlaceRoundedIcon sx={{ fontSize: 17 }} />{c.address}</p>
                  <div className="cinema-card__stats">
                    <span><MeetingRoomRoundedIcon sx={{ fontSize: 16 }} />{c.screens} phòng chiếu</span>
                    <span><AccessTimeRoundedIcon sx={{ fontSize: 16 }} />{c.openingHours}</span>
                  </div>
                  <div className="cinema-card__facilities">
                    {c.facilities.map((f) => <span key={f} className="cinema-chip">{f}</span>)}
                  </div>
                  <button type="button" className="cinema-card__btn">Xem chi tiết</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </Box>
  );
};

export default CinemaPage;
