import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Typography,
} from '@mui/material';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded';
import { theaterService } from '../services/theaterService';
import './CinemaPage.css';

const ALL = 'Tất cả';
const KNOWN_BRANDS = ['CGV', 'Galaxy', 'Lotte', 'Beta', 'BHD', 'CineBox', 'FilmTicket', 'ThauFilm'];
const THEATER_IMAGES = [
  '/images/cinemas/theater-exterior.jpg',
  '/images/cinemas/theater-auditorium.jpg',
  '/images/cinemas/theater-lobby.jpg',
  '/images/cinemas/theater-hallway.jpg',
];

const normalizeText = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getBrand = (name = '') =>
  KNOWN_BRANDS.find((brand) => normalizeText(name).includes(normalizeText(brand))) ||
  name.trim().split(/\s+/)[0] ||
  'Rạp phim';

const getRoomType = (room) => {
  if (room?.type) return room.type.replaceAll('_', ' ');
  const [, suffix] = (room?.name || '').split(' - ');
  return suffix || 'Phòng chiếu';
};

const getRoomCount = (theater) => theater.cinemaRooms?.length || 0;

const getSeatCount = (theater) =>
  (theater.cinemaRooms || []).reduce((sum, room) => sum + (Number(room.capacity) || 0), 0);

const getTheaterImageIndex = (theater) => {
  const source = String(theater?.id || theater?.name || '');
  const hash = [...source].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
    0,
  );
  return Math.abs(hash) % THEATER_IMAGES.length;
};

const getTheaterImage = (theater) =>
  theater?.imageUrl || THEATER_IMAGES[getTheaterImageIndex(theater)];

const TheaterCardSkeleton = () => (
  <article className="cinema-card cinema-card--skeleton">
    <Skeleton variant="rectangular" animation="wave" className="cinema-card__media-skeleton" />
    <div className="cinema-card__body">
      <Skeleton width="65%" height={30} />
      <Skeleton width="92%" />
      <Skeleton width="78%" />
      <Skeleton height={42} sx={{ mt: 1 }} />
    </div>
  </article>
);

const CinemaPage = () => {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    theaterService
      .listWithRooms()
      .then((data) => {
        if (!active) return;
        setTheaters(data);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setTheaters([]);
        setError(requestError.message || 'Không thể tải danh sách rạp chiếu.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const cities = useMemo(
    () => [ALL, ...new Set(theaters.map((theater) => theater.city).filter(Boolean))],
    [theaters],
  );

  const brands = useMemo(
    () => [ALL, ...new Set(theaters.map((theater) => getBrand(theater.name)))],
    [theaters],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return theaters.filter((theater) => {
      const searchableText = normalizeText(
        `${theater.name || ''} ${theater.address || ''} ${theater.city || ''}`,
      );
      if (normalizedQuery && !searchableText.includes(normalizedQuery)) return false;
      if (city !== ALL && theater.city !== city) return false;
      if (brand !== ALL && getBrand(theater.name) !== brand) return false;
      return true;
    });
  }, [theaters, query, city, brand]);

  const retry = () => {
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  };

  return (
    <Box className="cinema-page">
      <section className="cinema-hero">
        <div className="cinema-hero__inner">
          <Typography className="cinema-hero__eyebrow" variant="overline">
            HỆ THỐNG RẠP
          </Typography>
          <h1 className="cinema-hero__title">Tìm rạp chiếu gần bạn</h1>
          <p className="cinema-hero__sub">
            Khám phá hệ thống rạp hiện đại, chọn địa điểm thuận tiện và sẵn sàng cho
            trải nghiệm điện ảnh trọn vẹn.
          </p>
          {!loading && !error && (
            <div className="cinema-hero__summary" aria-label="Thống kê hệ thống rạp">
              <span><strong>{theaters.length}</strong> rạp đang hoạt động</span>
              <span>
                <strong>{theaters.reduce((sum, theater) => sum + getRoomCount(theater), 0)}</strong>
                phòng chiếu
              </span>
              <span><strong>{cities.length - 1}</strong> thành phố</span>
            </div>
          )}
        </div>
      </section>

      <Container maxWidth="xl" className="cinema-content">
        <div className="cinema-toolbar">
          <div className="cinema-search">
            <SearchRoundedIcon />
            <input
              aria-label="Tìm rạp"
              placeholder="Tìm rạp theo tên, địa chỉ hoặc thành phố..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="cinema-filters">
            <select
              aria-label="Lọc theo thành phố"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              {cities.map((item) => (
                <option key={item} value={item}>{item === ALL ? 'Thành phố' : item}</option>
              ))}
            </select>
            <select
              aria-label="Lọc theo thương hiệu"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            >
              {brands.map((item) => (
                <option key={item} value={item}>{item === ALL ? 'Thương hiệu' : item}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <Alert
            severity="error"
            className="cinema-state"
            action={<Button color="inherit" onClick={retry}>Thử lại</Button>}
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="cinema-grid" aria-label="Đang tải danh sách rạp">
            {Array.from({ length: 6 }, (_, index) => <TheaterCardSkeleton key={index} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="cinema-empty">
            <SearchRoundedIcon />
            <h2>Không tìm thấy rạp phù hợp</h2>
            <p>Thử đổi từ khóa hoặc bộ lọc để xem thêm địa điểm.</p>
            <Button
              variant="outlined"
              onClick={() => {
                setQuery('');
                setCity(ALL);
                setBrand(ALL);
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="cinema-grid">
            {filtered.map((theater) => {
              const roomTypes = [...new Set((theater.cinemaRooms || []).map(getRoomType))];
              const imageIndex = getTheaterImageIndex(theater);

              return (
                <article key={theater.id} className="cinema-card">
                  <div className={`cinema-card__media cinema-card__media--${imageIndex}`}>
                    <img
                      src={getTheaterImage(theater)}
                      alt={`Không gian rạp chiếu minh họa cho ${theater.name}`}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                    <span className="cinema-card__brand">{getBrand(theater.name)}</span>
                  </div>
                  <div className="cinema-card__body">
                    <h2 className="cinema-card__name">{theater.name}</h2>
                    <p className="cinema-card__row">
                      <PlaceRoundedIcon />
                      <span>
                        {[theater.address, theater.city].filter(Boolean).join(', ') ||
                          'Địa chỉ đang cập nhật'}
                      </span>
                    </p>
                    <div className="cinema-card__stats">
                      <span><MeetingRoomRoundedIcon />{getRoomCount(theater)} phòng</span>
                      <span><EventSeatRoundedIcon />{getSeatCount(theater)} ghế</span>
                    </div>
                    <div className="cinema-card__facilities">
                      {roomTypes.length > 0 ? (
                        roomTypes
                          .slice(0, 3)
                          .map((type) => <span key={type} className="cinema-chip">{type}</span>)
                      ) : (
                        <span className="cinema-chip cinema-chip--muted">
                          Thông tin phòng đang cập nhật
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cinema-card__btn"
                      onClick={() => setSelectedTheater(theater)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>

      <Dialog
        open={Boolean(selectedTheater)}
        onClose={() => setSelectedTheater(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="theater-detail-title"
      >
        {selectedTheater && (
          <>
            <DialogTitle id="theater-detail-title" className="cinema-dialog__title">
              <span className="cinema-dialog__icon"><TheatersRoundedIcon /></span>
              <span>
                <small>{getBrand(selectedTheater.name)}</small>
                {selectedTheater.name}
              </span>
            </DialogTitle>
            <DialogContent>
              <img
                className="cinema-dialog__cover"
                src={getTheaterImage(selectedTheater)}
                alt={`Không gian rạp chiếu minh họa cho ${selectedTheater.name}`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
              <div className="cinema-dialog__info">
                <p>
                  <PlaceRoundedIcon />
                  {[selectedTheater.address, selectedTheater.city].filter(Boolean).join(', ') ||
                    'Địa chỉ đang cập nhật'}
                </p>
                <p>
                  <PhoneRoundedIcon />
                  {selectedTheater.phoneNumber || 'Số điện thoại đang cập nhật'}
                </p>
              </div>

              <div className="cinema-dialog__heading">
                <h3>Phòng chiếu</h3>
                <span>
                  {getRoomCount(selectedTheater)} phòng · {getSeatCount(selectedTheater)} ghế
                </span>
              </div>

              {selectedTheater.cinemaRooms?.length > 0 ? (
                <div className="cinema-room-list">
                  {selectedTheater.cinemaRooms.map((room) => (
                    <div key={room.id} className="cinema-room">
                      <span className="cinema-room__icon"><MeetingRoomRoundedIcon /></span>
                      <span className="cinema-room__name">
                        <strong>{room.name}</strong>
                        <small>{getRoomType(room)}</small>
                      </span>
                      <span className="cinema-room__capacity">{room.capacity || 0} ghế</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography color="text.secondary">
                  Thông tin phòng chiếu đang được cập nhật.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTheater(null)}>Đóng</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CinemaPage;
