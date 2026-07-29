import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import api from '../services/api';
import { cinemas as fallbackCinemas } from '../data/cinemas';
import './CinemaPage.css';

const CinemaPage = () => {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [brand, setBrand] = useState('Tất cả');
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [cinemaDetail, setCinemaDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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

  const openCinemaDetail = async (cinema) => {
    setSelectedCinema(cinema);
    setCinemaDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const response = await api.get(`/api/theaters/${cinema.id}`);
      const detail = response?.data?.data ?? response?.data;
      setCinemaDetail(detail);
    } catch {
      setDetailError('Không thể tải chi tiết rạp. Vui lòng thử lại.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeCinemaDetail = () => {
    setSelectedCinema(null);
    setCinemaDetail(null);
    setDetailError('');
  };

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
                  <button
                    type="button"
                    className="cinema-card__btn"
                    onClick={() => openCinemaDetail(c)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>

      <Dialog
        open={Boolean(selectedCinema)}
        onClose={closeCinemaDetail}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'cinema-detail' }}
      >
        <DialogContent className="cinema-detail__content">
          <IconButton
            className="cinema-detail__close"
            onClick={closeCinemaDetail}
            aria-label="Đóng chi tiết rạp"
          >
            <CloseRoundedIcon />
          </IconButton>

          <div className="cinema-detail__cover">
            <img
              src={cinemaDetail?.imageUrl || selectedCinema?.image || '/placeholder.svg'}
              alt={cinemaDetail?.name || selectedCinema?.name || ''}
            />
            <div className="cinema-detail__cover-shade" />
            <div className="cinema-detail__heading">
              <span>{selectedCinema?.brand}</span>
              <h2>{cinemaDetail?.name || selectedCinema?.name}</h2>
            </div>
          </div>

          <div className="cinema-detail__body">
            {detailLoading ? (
              <div className="cinema-detail__loading">
                <CircularProgress size={34} color="error" />
                <span>Đang tải thông tin rạp…</span>
              </div>
            ) : detailError ? (
              <Alert severity="error">{detailError}</Alert>
            ) : (
              <>
                <div className="cinema-detail__meta">
                  <span>
                    <PlaceRoundedIcon />
                    {cinemaDetail?.address || selectedCinema?.address}
                  </span>
                  {cinemaDetail?.phoneNumber && (
                    <span>
                      <PhoneRoundedIcon />
                      {cinemaDetail.phoneNumber}
                    </span>
                  )}
                  <span>
                    <AccessTimeRoundedIcon />
                    {selectedCinema?.openingHours}
                  </span>
                </div>

                <div className="cinema-detail__section-heading">
                  <div>
                    <span>PHÒNG CHIẾU</span>
                    <h3>Không gian trải nghiệm</h3>
                  </div>
                  <strong>{cinemaDetail?.cinemaRooms?.length ?? 0} phòng</strong>
                </div>

                {cinemaDetail?.cinemaRooms?.length ? (
                  <div className="cinema-detail__rooms">
                    {cinemaDetail.cinemaRooms.map((room) => (
                      <article key={room.id} className="cinema-room">
                        <MeetingRoomRoundedIcon />
                        <div>
                          <h4>{room.name}</h4>
                          <p>
                            {room.type || 'Phòng tiêu chuẩn'}
                            {room.capacity ? ` · ${room.capacity} ghế` : ''}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cinema-detail__empty">
                    Rạp chưa có phòng chiếu đang hoạt động.
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CinemaPage;
