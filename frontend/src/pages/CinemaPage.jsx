import { useMemo, useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import theaterService from '../services/theaterService'; // Service update
import './CinemaPage.css';

// Danh sách các Thành Phố chính
const CINEMA_CITIES = ['Tất cả', 'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai'];

const CinemaPage = () => {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Tất cả');
  
  // State quản lý danh sách rạp từ Backend & trạng thái Loading
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(false);

  // Gọi API lấy dữ liệu rạp theo Tỉnh/Thành
  useEffect(() => {
    const fetchTheaters = async () => {
      setLoading(true);
      try {
        // Nếu chọn "Tất cả" -> truyền null/undefined để lấy hết rạp ACTIVE
        // Nếu chọn tỉnh thành cụ thể -> truyền tên city sang backend (?city=...)
        const selectedCityParam = city === 'Tất cả' ? '' : city;
        const data = await theaterService.getActiveTheaters(selectedCityParam);
        setTheaters(data || []);
      } catch (error) {
        console.error("Lỗi khi fetch rạp từ Backend:", error);
        setTheaters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTheaters();
  }, [city]);

  // Lọc tìm kiếm theo Tên hoặc Địa chỉ trực tiếp trên Frontend
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return theaters.filter((c) => {
      if (!q) return true;
      const matchName = c.name ? c.name.toLowerCase().includes(q) : false;
      const matchAddress = c.address ? c.address.toLowerCase().includes(q) : false;
      return matchName || matchAddress;
    });
  }, [query, theaters]);

  return (
    <Box sx={{ color: '#fff', pb: 8 }}>
      <div className="cinema-hero">
        <div className="cinema-hero__inner">
          <Typography variant="overline" sx={{ color: '#e50914', fontWeight: 800, letterSpacing: '0.12em' }}>
            HỆ THỐNG RẠP
          </Typography>
          <h1 className="cinema-hero__title">Tìm rạp chiếu gần bạn</h1>
          <p className="cinema-hero__sub">Trải nghiệm điện ảnh đỉnh cao với hệ thống rạp hiện đại trên toàn quốc.</p>
        </div>
      </div>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <div className="cinema-toolbar">
          <div className="cinema-search">
            <SearchRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <input 
              placeholder="Tìm rạp theo tên hoặc địa chỉ…" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
            />
          </div>
          <div className="cinema-filters">
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              {CINEMA_CITIES.map((c) => (
                <option key={c} value={c}>{c === 'Tất cả' ? 'Tất cả Thành Phố' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trạng thái Loading */}
        {loading ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.6)' }}>
            Đang tải danh sách rạp...
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.6)' }}>
            Không tìm thấy rạp phù hợp.
          </Typography>
        ) : (
          <div className="cinema-grid">
            {filtered.map((c) => (
              <article key={c.id} className="cinema-card">
                <div className="cinema-card__media">
                  {/* Sử dụng ảnh mặc định nếu backend chưa có field image */}
                  <img 
                    src={c.image || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80"} 
                    alt={c.name} 
                    loading="lazy" 
                  />
                  <span className="cinema-card__brand">{c.city || "Cinema"}</span>
                </div>
                <div className="cinema-card__body">
                  <h3 className="cinema-card__name">{c.name}</h3>
                  <p className="cinema-card__row">
                    <PlaceRoundedIcon sx={{ fontSize: 17, mr: 0.5, flexShrink: 0 }} />
                    {c.address}
                  </p>
                  
                  {c.phoneNumber && (
                    <p className="cinema-card__row" style={{ marginTop: '4px', color: '#94a3b8' }}>
                      <PhoneRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {c.phoneNumber}
                    </p>
                  )}

                  <div className="cinema-card__stats" style={{ marginTop: '12px' }}>
                    <span><MeetingRoomRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />Rạp tiêu chuẩn</span>
                    <span><AccessTimeRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />08:00 - 23:30</span>
                  </div>

                  <button type="button" className="cinema-card__btn" style={{ marginTop: '16px' }}>
                    Xem suất chiếu
                  </button>
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