import { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Alert, Snackbar, Button } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import BookingStepper from '../../components/BookingStepper';
import SeatMap from '../../components/SeatMap';
import BookingSidebar from '../../components/BookingSidebar';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import EmptyState from '../../components/common/EmptyState';

import { useBooking } from '../../hooks/useBooking';
import { MOCK_MOVIES, getShowtimesForMovieAndDate } from '../../mock/bookingData';

export const SeatSelectionPage = () => {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    loading: apiLoading,
    error: apiError,
    clearError,
    getSeats,
    create,
    getDetail,
  } = useBooking();

  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeBooking, setActiveBooking] = useState(location.state?.activeBooking || null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Danh sách ghế đang bị khóa theo BE (sold/held)
  const soldSeatIds = useMemo(() => {
    const ids = new Set();
    seats.forEach((s) => { if (s.isSold) ids.add(s.id); });
    return ids;
  }, [seats]);

  // Load movie/showtime từ router state hoặc fallback mock
  useEffect(() => {
    let currentMovie = location.state?.movie;
    let currentShowtime = location.state?.showtime;

    if ((!currentMovie || !currentShowtime) && showtimeId) {
      for (const m of MOCK_MOVIES) {
        for (let d = 0; d < 5; d++) {
          const list = getShowtimesForMovieAndDate(m.id, `date-${d}`);
          const found = list.find((s) => s.id === showtimeId);
          if (found) {
            currentMovie = m;
            currentShowtime = found;
            break;
          }
        }
        if (currentShowtime) break;
      }
    }

    if (currentMovie && currentShowtime) {
      setMovie(currentMovie);
      setShowtime(currentShowtime);
    }
    setLoadingDetails(false);
  }, [showtimeId, location.state]);

  // Lấy sơ đồ ghế khi có showtimeId
  useEffect(() => {
    if (!showtimeId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const seatLayout = await getSeats(showtimeId);
        if (cancelled) return;
        setSeats(Array.isArray(seatLayout) ? seatLayout : []);
      } catch (err) {
        if (cancelled) return;
        setSeats([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [showtimeId, getSeats]);

  // Khi có bookingId từ navigation (từ trang thanh toán), gọi lại detail để recover selectedSeats
  useEffect(() => {
    const bookingId = location.state?.bookingId;
    if (!bookingId) return;
    let cancelled = false;

    const recover = async () => {
      try {
        const detail = await getDetail(bookingId);
        if (cancelled || !detail) return;
        const recoveredSeats = Array.isArray(detail.seats) ? detail.seats : [];
        setSelectedSeats((prev) => {
          if (recoveredSeats.length === 0) return prev;
          return recoveredSeats;
        });
        setActiveBooking(detail);
      } catch (err) {
        // keep current selectedSeats if recovery failed
      }
    };

    recover();
    return () => {
      cancelled = true;
    };
  }, [location.state?.bookingId, getDetail]);

  // Bắt lỗi API và hiển thị snackbar
  useEffect(() => {
    if (apiError) {
      setSnackbarMessage(apiError);
      setSnackbarOpen(true);
    }
  }, [apiError]);

  const handleToggleSelectSeat = (seat) => {
    setSelectedSeats((prev) => {
      const isAlreadySelected = prev.some((s) => s.id === seat.id);
      if (isAlreadySelected) {
        return prev.filter((s) => s.id !== seat.id);
      }

      if (prev.length >= 8) {
        setSnackbarMessage('Bạn chỉ được chọn tối đa 8 ghế trong một giao dịch.');
        setSnackbarOpen(true);
        return prev;
      }

      // Tránh chọn ghế đang bán/đang giữ
      if (seat.isSold || soldSeatIds.has(seat.id)) {
        setSnackbarMessage('Ghế này hiện không khả dụng.');
        setSnackbarOpen(true);
        return prev;
      }

      return [...prev, seat];
    });
  };

  const handleProceed = async () => {
    if (apiLoading) return;
    if (selectedSeats.length === 0) {
      setSnackbarMessage('Vui lòng chọn ít nhất 1 ghế.');
      setSnackbarOpen(true);
      return;
    }

    const invalidSeat = selectedSeats.find((s) => soldSeatIds.has(s.id) || s.isSold);
    if (invalidSeat) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== invalidSeat.id));
      setSnackbarMessage('Ghế bạn chọn vừa hết. Vui lòng chọn ghế khác.');
      setSnackbarOpen(true);
      return;
    }

    const seatIds = selectedSeats.map((s) => s.id);
    try {
      const bookingResult = await create(showtimeId, seatIds);
      if (bookingResult && bookingResult.id) {
        setActiveBooking(bookingResult);
        navigate('/booking/summary', {
          state: {
            bookingId: bookingResult.id,
            movie,
            showtime,
            selectedSeats,
            activeBooking: bookingResult,
          },
        });
      }
    } catch (err) {
      // Lỗi đã được hook quản lý
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    clearError();
  };

  if (loadingDetails) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang xử lý thông tin..." blur />
      </Box>
    );
  }

  if (!movie || !showtime) {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          Không tìm thấy thông tin suất chiếu này. Vui lòng chọn phim khác.
        </Alert>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/movies')}
          sx={{ mt: 3 }}
        >
          Quay lại danh sách phim
        </Button>
      </Container>
    );
  }

  const isProcessing = apiLoading && selectedSeats.length === 0;
  const isHolding = apiLoading && selectedSeats.length > 0;

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      <LoadingOverlay open={isProcessing} message="Đang tải sơ đồ ghế..." blur />
      <LoadingOverlay open={isHolding} message="Đang giữ ghế cho bạn..." blur />

      <BookingStepper activeStep={1} />

      <PageHeader
        title="Chọn Ghế Xem Phim"
        subtitle={`${movie.title} • ${showtime.time} • ${showtime.room}`}
        onBack={() => navigate(`/movies/${movie.id}`)}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box sx={{ flex: '1 1 65%', minWidth: 0 }}>
          {seats.length === 0 && !apiLoading ? (
            <EmptyState
              title="Không tìm thấy sơ đồ ghế"
              description="Hiện tại phòng chiếu này chưa được cấu hình sơ đồ ghế ngồi. Vui lòng chọn suất chiếu khác."
              actionText="Quay lại"
              onAction={() => navigate(`/movies/${movie.id}`)}
            />
          ) : (
            <SectionCard
              title="Sơ Đồ Ghế Ngồi"
              sx={{
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 5,
                position: 'relative',
              }}
            >
              <SeatMap
                seats={seats}
                selectedSeats={selectedSeats}
                onToggleSelectSeat={handleToggleSelectSeat}
              />
            </SectionCard>
          )}
        </Box>

        <Box sx={{ flex: '0 0 340px', display: { xs: 'none', lg: 'block' } }}>
          <BookingSidebar
            movie={movie}
            showtime={showtime}
            selectedSeats={selectedSeats}
            onProceed={handleProceed}
            proceedText="Tiếp tục thanh toán"
            disabled={selectedSeats.length === 0 || apiLoading}
          />
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 3 }}>
        <BookingSidebar
          movie={movie}
          showtime={showtime}
          selectedSeats={selectedSeats}
          onProceed={handleProceed}
          proceedText="Tiếp tục thanh toán"
          disabled={selectedSeats.length === 0 || apiLoading}
        />
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={apiError ? 'error' : 'warning'}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 600 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SeatSelectionPage;
