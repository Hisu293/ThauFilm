import { useState, useEffect } from 'react';
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

  const { loading: apiLoading, error: apiError, clearError, getSeats, create } = useBooking();

  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // local snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 1. Resolve movie and showtime configurations on page load/refresh
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

  // 2. Fetch real seat layout from Backend API
  useEffect(() => {
    if (showtimeId) {
      getSeats(showtimeId)
        .then((seatLayout) => {
          setSeats(seatLayout);
        })
        .catch(() => {
          // Error is managed inside apiError from useBooking
        });
    }
  }, [showtimeId, getSeats]);

  // Handle errors from useBooking hook
  useEffect(() => {
    if (apiError) {
      setSnackbarMessage(apiError);
      setSnackbarOpen(true);
    }
  }, [apiError]);

  const handleToggleSelectSeat = (seat) => {
    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (isAlreadySelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 8) {
        setSnackbarMessage('Bạn chỉ được chọn tối đa 8 ghế trong một giao dịch.');
        setSnackbarOpen(true);
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleProceed = async () => {
    if (selectedSeats.length === 0 || apiLoading) return;
    
    const seatIds = selectedSeats.map((s) => s.id);
    try {
      // Create a booking hold on the backend
      const bookingResult = await create(showtimeId, seatIds);
      if (bookingResult && bookingResult.id) {
        navigate('/booking/summary', {
          state: {
            bookingId: bookingResult.id,
            movie,
            showtime,
            selectedSeats
          },
        });
      }
    } catch (err) {
      // Handled by API error interceptor
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

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 2, position: 'relative' }}>
      {/* Loading Overlay spinner during seat fetches or hold calls */}
      <LoadingOverlay open={apiLoading && seats.length === 0} message="Đang tải sơ đồ ghế..." blur />
      <LoadingOverlay open={apiLoading && selectedSeats.length > 0} message="Đang giữ ghế cho bạn..." blur />

      {/* Progress Stepper */}
      <BookingStepper activeStep={1} />

      {/* Header */}
      <PageHeader 
        title="Chọn Ghế Xem Phim" 
        subtitle={`${movie.title} • ${showtime.time} • ${showtime.room}`}
        onBack={() => navigate(`/movies/${movie.id}`)}
      />

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        gap: 4, 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        width: '100%'
      }}>
        {/* Seats panel — takes 65% width */}
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

        {/* Sidebar details — 35% width, sticky on the right */}
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

      {/* Mobile sidebar — shown below seat map on small screens */}
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

      {/* API warnings overlay */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={apiError ? "error" : "warning"} 
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
