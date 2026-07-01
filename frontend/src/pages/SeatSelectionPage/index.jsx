import { useCallback, useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Alert, Snackbar, Button, Chip, CircularProgress, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

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
import { useBookingFlow } from '../../context/BookingContext';
import { pruneExpiredPendingBookings, savePendingBooking } from '../../utils/pendingBookingStorage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unwrapApiResponse = (response) => response?.data?.data ?? response?.data ?? response;
const formatQueueWait = (seconds = 0) => {
  if (seconds <= 0) return 'Đang đến lượt';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Khoảng ${minutes} phút`;
};

const buildGroupSeatSuggestion = (seats = [], count = 1) => {
  const availableSeats = seats
    .filter((seat) => !seat.isSold)
    .slice()
    .sort((a, b) => String(a.rowName).localeCompare(String(b.rowName)) || Number(a.col) - Number(b.col));

  if (availableSeats.length < count) {
    throw new Error(`Không còn đủ ${count} ghế trống cho suất chiếu này.`);
  }

  const byRow = bookingService.groupSeatsByRow(availableSeats);
  const findBestWindow = (requireAdjacent) => {
    let best = null;
    byRow.forEach(({ seats: rowSeats }) => {
      if (rowSeats.length < count) return;
      for (let start = 0; start <= rowSeats.length - count; start += 1) {
        const group = rowSeats.slice(start, start + count);
        const span = group[group.length - 1].col - group[0].col;
        if (requireAdjacent && span !== count - 1) continue;
        const gaps = span - (count - 1);
        const score = span * 100 + gaps * 1000 + Math.abs(group[0].col + group[group.length - 1].col);
        if (!best || score < best.score) best = { seats: group, score };
      }
    });
    return best;
  };

  const exact = findBestWindow(true);
  if (exact) {
    return {
      exactMatch: true,
      requestedCount: count,
      message: `Đã tìm thấy ${count} ghế liền nhau cùng hàng.`,
      seats: exact.seats,
      seatIds: exact.seats.map((seat) => seat.id),
    };
  }

  const nearestSameRow = findBestWindow(false);
  if (nearestSameRow) {
    return {
      exactMatch: false,
      requestedCount: count,
      message: `Không có đủ ${count} ghế liền nhau. Đây là cụm ghế gần nhau nhất trong cùng hàng.`,
      seats: nearestSameRow.seats,
      seatIds: nearestSameRow.seats.map((seat) => seat.id),
    };
  }

  return {
    exactMatch: false,
    requestedCount: count,
    message: `Không có đủ ${count} ghế trong một hàng. Đây là các ghế gần nhất còn trống.`,
    seats: availableSeats.slice(0, count),
    seatIds: availableSeats.slice(0, count).map((seat) => seat.id),
  };
};

export const SeatSelectionPage = () => {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { updateBookingState } = useBookingFlow();

  const { loading: apiLoading, error: apiError, clearError, getSeats, create, getHistory, getDetail, cancel } = useBooking();

  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [, setActiveBooking] = useState(location.state?.activeBooking || null);
  const [groupSeatCount, setGroupSeatCount] = useState(6);
  const [suggestingSeats, setSuggestingSeats] = useState(false);
  const [seatSuggestion, setSeatSuggestion] = useState(null);
  const [ticketQueue, setTicketQueue] = useState(null);
  const [queueReady, setQueueReady] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const refreshSeats = useCallback(async (cancelledRef = { current: false }, silent = false) => {
    if (!showtimeId) return;
    try {
      const seatLayout = silent
        ? bookingService.normalizeSeats((await bookingApi.fetchShowtimeSeats(showtimeId))?.data ?? [])
        : await getSeats(showtimeId);
      if (cancelledRef.current) return;
      setSeats(Array.isArray(seatLayout) ? seatLayout : []);
    } catch {
      if (cancelledRef.current) return;
      setSeats([]);
    }
  }, [getSeats, showtimeId]);

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
    updateBookingState({
      selectedMovie: movie,
      selectedShowtime: showtime,
      selectedSeats: seatsToUse,
      bookingId: booking.id,
      paymentStatus: 'HOLD',
    });
  };

  // 1. Resolve movie and showtime configurations on page load/refresh
  useEffect(() => {
    pruneExpiredPendingBookings();

    let cancelled = false;

    let currentMovie = location.state?.movie;
    let currentShowtime = location.state?.showtime;

    if (currentMovie && currentShowtime) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setMovie(currentMovie);
        setShowtime(currentShowtime);
        setLoadingDetails(false);
      });
      return () => { cancelled = true; };
    }

    if (!showtimeId) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoadingDetails(false);
      });
      return () => { cancelled = true; };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setLoadingDetails(true);
    });
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
    const cancelledRef = { current: false };
    Promise.resolve().then(() => refreshSeats(cancelledRef));
    return () => {
      cancelledRef.current = true;
    };
  }, [showtimeId, refreshSeats]);

  useEffect(() => {
    if (!showtimeId || loadingDetails) return undefined;
    let cancelled = false;

    const joinQueue = async () => {
      setQueueLoading(true);
      try {
        const status = unwrapApiResponse(await bookingApi.joinTicketQueue(showtimeId));
        if (cancelled) return;
        setTicketQueue(status);
        setQueueReady(false);
      } catch {
        if (!cancelled) {
          setTicketQueue(null);
          setQueueReady(true);
        }
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    };

    joinQueue();
    return () => { cancelled = true; };
  }, [showtimeId, loadingDetails]);

  useEffect(() => {
    if (!showtimeId || queueReady || !ticketQueue?.queueRequired) return undefined;

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const status = unwrapApiResponse(await bookingApi.fetchTicketQueueStatus(showtimeId));
        if (!cancelled) setTicketQueue(status);
      } catch {
        if (!cancelled) setQueueReady(true);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [queueReady, showtimeId, ticketQueue?.queueRequired]);

  useEffect(() => {
    if (!showtimeId) return;
    const cancelledRef = { current: false };

    const releaseExpiredHolds = async () => {
      try {
        const history = await getHistory();
        if (cancelledRef.current) return;

        const expiredHolds = (Array.isArray(history) ? history : []).filter((booking) => {
          const status = String(booking.status || '').toUpperCase();
          const expiresMs = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : 0;
          return (
            String(booking.showtimeId) === String(showtimeId) &&
            ['HOLD', 'PENDING'].includes(status) &&
            Number.isFinite(expiresMs) &&
            expiresMs <= Date.now()
          );
        });

        if (expiredHolds.length === 0) return;
        await Promise.allSettled(expiredHolds.map((booking) => cancel(booking.id)));
        if (!cancelledRef.current) await refreshSeats(cancelledRef, true);
      } catch {
        // Seat refresh below still keeps the page usable if cleanup fails.
      }
    };

    releaseExpiredHolds();
    return () => {
      cancelledRef.current = true;
    };
  }, [cancel, getHistory, refreshSeats, showtimeId]);

  useEffect(() => {
    if (!showtimeId) return undefined;
    const cancelledRef = { current: false };
    const timer = window.setInterval(() => {
      refreshSeats(cancelledRef, true);
    }, 30000);
    return () => {
      cancelledRef.current = true;
      window.clearInterval(timer);
    };
  }, [showtimeId, refreshSeats]);

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
      } catch {
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
      Promise.resolve().then(() => {
        setSnackbarMessage(apiError);
        setSnackbarOpen(true);
      });
    }
  }, [apiError]);

  const soldSeatIds = useMemo(
    () => new Set(seats.filter((s) => s.isSold).map((s) => s.id)),
    [seats],
  );

  const handleToggleSelectSeat = (seat) => {
    setSeatSuggestion(null);
    setSelectedSeats((prev) => {
      const isAlreadySelected = prev.some((s) => s.id === seat.id);
      if (isAlreadySelected) {
        const next = prev.filter((s) => s.id !== seat.id);
        return next;
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

      const next = [...prev, seat];
      return next;
    });
  };

  const handleSuggestGroupSeats = async () => {
    const count = Math.max(1, Math.min(8, Number(groupSeatCount) || 1));
    setGroupSeatCount(count);
    setSuggestingSeats(true);
    setSeatSuggestion(null);

    try {
      const suggestion = buildGroupSeatSuggestion(seats, count);
      setSelectedSeats(suggestion.seats);
      setSeatSuggestion(suggestion);
      setSnackbarMessage(suggestion.message);
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(err.message || 'Không thể tìm ghế nhóm phù hợp.');
      setSnackbarOpen(true);
    } finally {
      setSuggestingSeats(false);
    }
  };

  useEffect(() => {
    updateBookingState({
      selectedMovie: movie,
      selectedShowtime: showtime,
      selectedSeats,
      paymentStatus: 'SELECTING_SEATS',
    });
  }, [movie, selectedSeats, showtime, updateBookingState]);

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
        updateBookingState({
          selectedMovie: movie,
          selectedShowtime: showtime,
          selectedSeats,
          bookingId: bookingResult.id,
          paymentStatus: 'HOLD',
        });
      }
    } catch (err) {
      try {
        const history = await getHistory();
        const selectedIdSet = new Set(seatIds.map(String));
        const matchedPendingBooking = history.find((booking) => {
          if (!['HOLD', 'PENDING'].includes(String(booking.status || '').toUpperCase())) return false;
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

  const handleEnterSeatSelection = async () => {
    setQueueBusy(true);
    try {
      await bookingApi.leaveTicketQueue(showtimeId);
    } catch {
      // The seat map is still usable if leaving the display queue fails.
    } finally {
      setQueueReady(true);
      setQueueBusy(false);
    }
  };

  if (loadingDetails) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang xử lý thông tin..." blur />
      </Box>
    );
  }

  if (!queueReady && queueLoading) {
    return (
      <Box sx={{ minHeight: '80vh', position: 'relative' }}>
        <LoadingOverlay open={true} message="Đang vào hàng đợi..." blur />
      </Box>
    );
  }

  if (!queueReady && ticketQueue?.queueRequired) {
    const entries = Array.isArray(ticketQueue.entries) ? ticketQueue.entries : [];
    const currentEntry = entries.find((entry) => entry.currentUser);
    const canEnter = Boolean(ticketQueue.admitted || currentEntry?.admitted);

    return (
      <Container maxWidth="md" sx={{ minHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <Paper
          sx={{
            width: '100%',
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            border: '1px solid rgba(251, 191, 36, 0.22)',
            bgcolor: 'rgba(15, 23, 42, 0.94)',
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
              <Typography variant="overline" color="primary.main" fontWeight={900}>
                Hàng đợi chọn ghế
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>
                Team đang vào theo thứ tự
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                Mỗi tài khoản đăng nhập vào suất chiếu này sẽ có một dòng riêng trong hàng đợi.
              </Typography>
            </Box>

            <Box textAlign="center">
              <Typography variant="h2" fontWeight={900} color="primary.main">
                #{ticketQueue.position || currentEntry?.position || '-'}
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {canEnter ? 'Đã đến lượt bạn' : formatQueueWait(ticketQueue.estimatedWaitSeconds)}
              </Typography>
            </Box>

            <LinearProgress variant={canEnter ? 'determinate' : 'indeterminate'} value={canEnter ? 100 : undefined} sx={{ height: 8, borderRadius: 999 }} />

            <Stack spacing={1.25}>
              {entries.map((entry) => (
                <Paper
                  key={entry.userId}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    borderColor: entry.currentUser ? 'primary.main' : 'rgba(148, 163, 184, 0.18)',
                    bgcolor: entry.currentUser ? 'rgba(251, 191, 36, 0.10)' : 'rgba(15, 23, 42, 0.58)',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
                      <Typography color="primary.main" fontWeight={900} sx={{ width: 44 }}>
                        #{entry.position}
                      </Typography>
                      <Box minWidth={0}>
                        <Typography fontWeight={800} noWrap>
                          {entry.displayName || entry.email || 'Thành viên'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {entry.email || 'Đang chờ chọn ghế'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {entry.currentUser && <Chip size="small" color="primary" label="Bạn" />}
                      <Chip size="small" color={entry.admitted ? 'success' : 'warning'} label={entry.admitted ? 'Đến lượt' : 'Đang chờ'} />
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Danh sách tự cập nhật khi thành viên khác đăng nhập hoặc vào chọn ghế.
              </Typography>
              <Button variant="contained" disabled={!canEnter || queueBusy} onClick={handleEnterSeatSelection}>
                {queueBusy ? 'Đang mở...' : 'Vào chọn ghế'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
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
              <Box
                sx={{
                  width: '100%',
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                  bgcolor: 'rgba(15, 23, 42, 0.32)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={900}>Tìm ghế nhóm tự động</Typography>
                      {seatSuggestion && (
                        <Chip
                          size="small"
                          color={seatSuggestion.exactMatch ? 'success' : 'warning'}
                          label={seatSuggestion.exactMatch ? 'Liền nhau' : 'Gần nhất'}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Nhập số người, hệ thống ưu tiên tìm ghế liền nhau cùng hàng; nếu hết chỗ sẽ chọn cụm gần nhất.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Số người"
                      type="number"
                      size="small"
                      value={groupSeatCount}
                      onChange={(event) => setGroupSeatCount(event.target.value)}
                      inputProps={{ min: 1, max: 8 }}
                      sx={{ width: 110 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={suggestingSeats ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                      onClick={handleSuggestGroupSeats}
                      disabled={suggestingSeats || apiLoading || seats.length === 0}
                    >
                      Tìm ghế
                    </Button>
                  </Stack>
                </Stack>
                {seatSuggestion?.message && (
                  <Alert severity={seatSuggestion.exactMatch ? 'success' : 'warning'} sx={{ mt: 2 }}>
                    {seatSuggestion.message}
                  </Alert>
                )}
              </Box>
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
