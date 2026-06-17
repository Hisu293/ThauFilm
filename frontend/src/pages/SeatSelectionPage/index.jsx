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
import { bookingApi } from '../../api/bookingApi';
import { bookingService } from '../../services/bookingService';
import { fetchMovieById } from '../../services/movieService';
import { pruneExpiredPendingBookings, savePendingBooking } from '../../utils/pendingBookingStorage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SeatSelectionPage = () => {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { loading: apiLoading, error: apiError, clearError, getSeats, create, getHistory, getDetail } = useBooking();

  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [activeBooking, setActiveBooking] = useState(location.state?.activeBooking || null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const resumePendingBooking = (booking, seatsToUse) => {
    savePendingBooking({
      id: booking.id,
      movie,
      showtime,
      selectedSeats: seatsToUse,
      holdExpiresAt: booking.holdExpiresAt,
      confirmationCode: booking.confirmationCode,
    });

    navigate('/booking/summary', {
      state: {
        bookingId: booking.id,
        movie,
        showtime,
        selectedSeats: seatsToUse,
        holdExpiresAt: booking.holdExpiresAt,
      },
    });
  };

  // 1. Resolve movie and showtime configurations on page load/refresh
  useEffect(() => {
    pruneExpiredPendingBookings();

    let cancelled = false;

    let currentMovie = location.state?.movie;
    let currentShowtime = location.state?.showtime;

    if (currentMovie && currentShowtime) {
      setMovie(currentMovie);
      setShowtime(currentShowtime);
      setLoadingDetails(false);
      return () => { cancelled = true; };
    }

    if (!showtimeId) {
      setLoadingDetails(false);
      return () => { cancelled = true; };
    }

    setLoadingDetails(true);
    bookingApi.fetchShowtimes()
      .then((res) => {
        if (cancelled) return null;
        const rawShowtimes = res?.data ?? res ?? [];
        const found = bookingService
          .normalizeShowtimes(rawShowtimes)
          .find((item) => item.id === String(showtimeId));

        if (!found) return null;
        setShowtime(found);

        if (found.movieId) {
          return fetchMovieById(found.movieId).then((movieDetail) => {
            if (!cancelled) setMovie(movieDetail);
          });
        }

        if (!cancelled) {
          setMovie({ id: '', title: found.movieTitle || 'Phim đang chiếu', posterUrl: '/placeholder.svg' });
        }
        return null;
      })
      .catch((err) => {
        setSnackbarMessage(err.message || 'Không tải được thông tin suất chiếu.');
        setSnackbarOpen(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => { cancelled = true; };
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
    if (selectedSeats.length === 0 || apiLoading) return;

    if (showtime?.startTime) {
      const showtimeMs = new Date(showtime.startTime).getTime();
      if (!Number.isNaN(showtimeMs) && showtimeMs <= Date.now()) {
        setSnackbarMessage('Suất chiếu này đã qua giờ đặt vé. Vui lòng chọn suất chiếu khác.');
        setSnackbarOpen(true);
        return;
      }
    }
    
    const seatIds = selectedSeats.map((s) => s.id);
    const invalidShowtimeId = !UUID_PATTERN.test(String(showtimeId || ''));
    const invalidSeatIds = seatIds.filter((id) => !UUID_PATTERN.test(String(id || '')));

    if (invalidShowtimeId || invalidSeatIds.length > 0) {
      const localMessage = invalidShowtimeId
        ? 'Suất chiếu hiện tại có mã không hợp lệ.'
        : `Có ${invalidSeatIds.length} ghế đang mang mã không hợp lệ.`;

      setSnackbarMessage(`${localMessage} Vui lòng tải lại trang hoặc chọn lại suất chiếu.`);
      setSnackbarOpen(true);
      console.error('Create booking blocked by local UUID validation', {
        showtimeId,
        seatIds,
        invalidShowtimeId,
        invalidSeatIds,
      });
      return;
    }

    try {
      // Create a booking hold on the backend
      const bookingResult = await create(showtimeId, seatIds, 'ONLINE');
      if (bookingResult && bookingResult.id) {
        savePendingBooking({
          id: bookingResult.id,
          movie,
          showtime,
          selectedSeats,
          holdExpiresAt: bookingResult.holdExpiresAt,
          confirmationCode: bookingResult.confirmationCode,
        });

        navigate('/booking/summary', {
          state: {
            bookingId: bookingResult.id,
            movie,
            showtime,
            selectedSeats,
            holdExpiresAt: bookingResult.holdExpiresAt,
          },
        });
      }
    } catch (err) {
      try {
        const history = await getHistory();
        const selectedIdSet = new Set(seatIds.map(String));
        const matchedPendingBooking = history.find((booking) => {
          if (booking.status !== 'PENDING') return false;
          if (String(booking.showtimeId) !== String(showtimeId)) return false;
          if (!booking.holdExpiresAt || new Date(booking.holdExpiresAt).getTime() <= Date.now()) return false;

          const bookingSeatIds = (booking.seats || []).map((seat) => String(seat.id));
          if (bookingSeatIds.length !== selectedIdSet.size) return false;

          return bookingSeatIds.every((id) => selectedIdSet.has(id));
        });

        if (matchedPendingBooking) {
          resumePendingBooking(matchedPendingBooking, matchedPendingBooking.seats || selectedSeats);
          return;
        }
      } catch {
        // Fall through to snackbar with original API error
      }

      setSnackbarMessage(
        err.message || 'Không thể giữ ghế. Có thể các ghế này đang nằm trong một đơn chờ thanh toán khác.'
      );
      console.error('Create booking failed', {
        message: err.message,
        details: err.details,
        raw: err.raw,
        showtimeId,
        showtimeStartTime: showtime?.startTime,
        seatIds,
      });
      setSnackbarOpen(true);
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
        onBack={() => navigate(movie?.id ? `/movies/${movie.id}` : '/movies')}
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
              onAction={() => navigate(movie?.id ? `/movies/${movie.id}` : '/movies')}
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
