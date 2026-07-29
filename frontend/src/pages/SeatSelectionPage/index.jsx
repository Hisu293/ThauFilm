import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Container, Box, Alert, Snackbar, Button, Chip, CircularProgress, FormControl, LinearProgress, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
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
import { useBookingNavigate } from '../../context/BookingNavigationContext';
import { pruneExpiredPendingBookings, removePendingBooking, savePendingBooking } from '../../utils/pendingBookingStorage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GROUP_SEAT_COUNTS = [2, 3, 4, 5, 6, 7, 8];
const unwrapApiResponse = (response) => response?.data?.data ?? response?.data ?? response;
const formatQueueWait = (seconds = 0) => {
  if (seconds <= 0) return 'Đang đến lượt';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Khoảng ${minutes} phút`;
};

export const SeatSelectionPage = () => {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useBookingNavigate();
  const { updateBookingState, clearBookingState } = useBookingFlow();

  const { loading: apiLoading, error: apiError, clearError, getSeats, create, updateSeats, getHistory, getDetail, cancel } = useBooking();
  const [editingBookingId, setEditingBookingId] = useState(() => (
    location.state?.editMode && location.state?.bookingId
      ? location.state.bookingId
      : sessionStorage.getItem('tf_booking_id')
  ));

  const [movie, setMovie] = useState(null);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [seatLoadFailed, setSeatLoadFailed] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(location.state?.selectedSeats || []);
  const [holdingSeats, setHoldingSeats] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [, setActiveBooking] = useState(location.state?.activeBooking || null);

  const editingSeatIdsRef = useRef(new Set((location.state?.selectedSeats || []).map((seat) => String(seat.id))));


  const [groupSeatCount, setGroupSeatCount] = useState(2);
  const [suggestingSeats, setSuggestingSeats] = useState(false);
  const [seatSuggestion, setSeatSuggestion] = useState(null);
  const [selectedGroupOption, setSelectedGroupOption] = useState(null);
  const [ticketQueue, setTicketQueue] = useState(null);
  const [queueReady, setQueueReady] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const activeBookingIdRef = useRef(editingBookingId);
  const proceedingRef = useRef(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    activeBookingIdRef.current = editingBookingId;
  }, [editingBookingId]);

  useEffect(() => () => {
    const bookingId = activeBookingIdRef.current;
    if (!bookingId || proceedingRef.current) return;
    bookingApi.cancelBooking(bookingId).catch(() => {});
    removePendingBooking(bookingId);
    sessionStorage.removeItem('tf_booking_id');
  }, []);

  const refreshSeats = useCallback(async (cancelledRef = { current: false }, silent = false) => {
    if (!showtimeId) return;
    try {
      const seatLayout = silent
        ? bookingService.normalizeSeats((await bookingApi.fetchShowtimeSeats(showtimeId))?.data ?? [])
        : await getSeats(showtimeId);
      if (cancelledRef.current) return;
      const editableSeatIds = editingSeatIdsRef.current;
      setSeatLoadFailed(false);
      setSeats((Array.isArray(seatLayout) ? seatLayout : []).map((seat) => (
        editableSeatIds.has(String(seat.id)) ? { ...seat, isSold: false } : seat
      )));
    } catch {
      if (cancelledRef.current) return;
      if (!silent) {
        setSeatLoadFailed(true);
        setSeats([]);
      }
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

    proceedingRef.current = true;
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
    if (!showtimeId || !queueReady) return undefined;
    let cancelled = false;
    const heartbeat = async () => {
      try {
        await bookingApi.heartbeatTicketQueue(showtimeId);
      } catch {
        // Presence is best-effort; booking flow should not be blocked by it.
      }
    };
    heartbeat();
    const timer = window.setInterval(() => {
      if (!cancelled) heartbeat();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [queueReady, showtimeId]);

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
    }, 3000);
    return () => {
      cancelledRef.current = true;
      window.clearInterval(timer);
    };
  }, [showtimeId, refreshSeats]);

  // Recover the active hold after back navigation, refresh, or a login redirect.
  useEffect(() => {
    const bookingId = editingBookingId;
    if (!bookingId) return;
    let cancelled = false;

    const recover = async () => {
      try {
        const detail = await getDetail(bookingId);
        if (cancelled || !detail) return;
        const isEditableHold = String(detail.status || '').toUpperCase() === 'HOLD';
        const belongsToShowtime = String(detail.showtimeId) === String(showtimeId);
        if (!isEditableHold || !belongsToShowtime) {
          setEditingBookingId(null);
          editingSeatIdsRef.current = new Set();
          return;
        }
        const recoveredSeats = Array.isArray(detail.seats) ? detail.seats : [];
        editingSeatIdsRef.current = new Set(recoveredSeats.map((seat) => String(seat.id)));
        setSelectedSeats((prev) => {
          if (recoveredSeats.length === 0) return prev;
          return recoveredSeats;
        });
        setSeats((current) => current.map((seat) => (
          editingSeatIdsRef.current.has(String(seat.id)) ? { ...seat, isSold: false } : seat
        )));
        setActiveBooking(detail);
      } catch {
        if (!cancelled) setEditingBookingId(null);
      }
    };

    recover();
    return () => {
      cancelled = true;
    };
  }, [editingBookingId, getDetail, showtimeId]);

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

  const syncSeatHold = useCallback(async (nextSeats) => {
    if (!showtimeId) return null;

    const seatIds = nextSeats.map((item) => item.id).filter(Boolean);
    const currentBookingId = activeBookingIdRef.current;

    if (seatIds.length === 0) {
      if (currentBookingId) {
        await cancel(currentBookingId);
        removePendingBooking(currentBookingId);
        sessionStorage.removeItem('tf_booking_id');
        activeBookingIdRef.current = null;
        setEditingBookingId(null);
        setActiveBooking(null);
      }
      return null;
    }

    const bookingResult = currentBookingId
      ? await updateSeats(currentBookingId, showtimeId, seatIds)
      : await create(showtimeId, seatIds, 'ONLINE');

    if (bookingResult?.id) {
      activeBookingIdRef.current = bookingResult.id;
      setEditingBookingId(bookingResult.id);
      setActiveBooking(bookingResult);
      sessionStorage.setItem('tf_booking_id', bookingResult.id);
      editingSeatIdsRef.current = new Set(seatIds.map(String));
      savePendingBooking({
        id: bookingResult.id,
        movie,
        showtime,
        selectedSeats: nextSeats,
        holdExpiresAt: bookingResult.holdExpiresAt,
        confirmationCode: bookingResult.confirmationCode,
      });
    }

    return bookingResult;
  }, [cancel, create, movie, showtime, showtimeId, updateSeats]);

  const applySeatSelection = useCallback(async (nextSeats, options = {}) => {
    if (apiLoading && !options.force) return false;

    setHoldingSeats(true);
    try {
      await syncSeatHold(nextSeats);
      setSelectedSeats(nextSeats);
      const nextSeatIds = new Set(nextSeats.map((item) => String(item.id)));
      setSeats((current) => current.map((item) => (
        nextSeatIds.has(String(item.id))
          ? { ...item, isSold: false, heldByMe: true, bookingStatus: 'HOLDING' }
          : item
      )));
      updateBookingState({
        selectedMovie: movie,
        selectedShowtime: showtime,
        selectedSeats: nextSeats,
        bookingId: activeBookingIdRef.current,
        paymentStatus: nextSeats.length > 0 ? 'HOLD' : 'SELECTING_SEATS',
      });
      return true;
    } catch (err) {
      setSnackbarMessage(err.message || 'Ghế này vừa được người khác giữ. Vui lòng chọn ghế khác.');
      setSnackbarOpen(true);
      await refreshSeats({ current: false }, true);
      return false;
    } finally {
      setHoldingSeats(false);
    }
  }, [apiLoading, movie, refreshSeats, showtime, syncSeatHold, updateBookingState]);

  const handleToggleSelectSeat = async (seat) => {
    if (apiLoading) return;
    setSeatSuggestion(null);
    setSelectedGroupOption(null);

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);
    if (isAlreadySelected) {
      await applySeatSelection(selectedSeats.filter((s) => s.id !== seat.id));
      return;
    }

    if (selectedSeats.length >= 8) {
      setSnackbarMessage('Bạn chỉ được chọn tối đa 8 ghế trong một giao dịch.');
      setSnackbarOpen(true);
      return;
    }

    if (seat.isSold || soldSeatIds.has(seat.id)) {
      setSnackbarMessage('Ghế này hiện không khả dụng.');
      setSnackbarOpen(true);
      return;
    }

    await applySeatSelection([...selectedSeats, seat]);
  };

  const handleSuggestGroupSeats = async () => {
    const count = Math.max(2, Math.min(8, Number(groupSeatCount) || 2));
    setGroupSeatCount(count);
    setSuggestingSeats(true);
    setSeatSuggestion(null);
    setSelectedGroupOption(null);

    try {
      const suggestion = unwrapApiResponse(await bookingApi.suggestGroupSeats(showtimeId, count));
      const options = (suggestion?.options ?? []).map((option) => ({
        ...option,
        seats: bookingService.normalizeSeats(option?.seats ?? []),
      })).filter((option) => (option.seatCapacity ?? option.seats.length) === count);
      if (options.length === 0) {
        throw new Error('Hệ thống chưa tìm được đủ ghế phù hợp. Vui lòng thử lại.');
      }
      setSeatSuggestion({
        ...suggestion,
        options,
      });
    } catch (err) {
      setSnackbarMessage(err.message || 'Không thể tìm ghế nhóm phù hợp.');
      setSnackbarOpen(true);
    } finally {
      setSuggestingSeats(false);
    }
  };

  const handleConfirmGroupSeats = async () => {
    if (!selectedGroupOption) return;

    const held = await applySeatSelection(selectedGroupOption.seats, { force: true });
    if (!held) {
      setSeatSuggestion(null);
      setSelectedGroupOption(null);
      return;
    }

    const labels = selectedGroupOption.seats.map((seat) => seat.label).join(', ');
    setSeatSuggestion((current) => ({
      ...current,
      confirmedMessage: `Đã giữ hàng ${selectedGroupOption.rowName}: ${labels}.`,
    }));
    setSnackbarMessage(`Đã giữ ${labels}.`);
    setSnackbarOpen(true);
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
    if (apiLoading) return;

    if (selectedSeats.length === 0) {
      if (!editingBookingId) return;
      try {
        await cancel(editingBookingId);
        sessionStorage.removeItem('tf_booking_id');
        removePendingBooking(editingBookingId);
        clearBookingState();
        navigate(movie?.id ? `/movies/${movie.id}` : '/my-bookings', { replace: true });
      } catch (err) {
        setSnackbarMessage(err.message || 'Không thể hủy booking này.');
        setSnackbarOpen(true);
      }
      return;
    }

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
      console.error('Tạo đơn đặt vé bị chặn do xác thực UUID cục bộ', {
        showtimeId,
        seatIds,
        invalidShowtimeId,
        invalidSeatIds,
      });
      return;
    }

    try {
      const bookingResult = editingBookingId
        ? await updateSeats(editingBookingId, showtimeId, seatIds)
        : await create(showtimeId, seatIds, 'ONLINE');
      if (bookingResult && bookingResult.id) {
        proceedingRef.current = true;
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
      if (!editingBookingId) try {
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
        err.message || (editingBookingId
          ? 'Không thể cập nhật ghế cho booking này.'
          : 'Không thể giữ ghế. Có thể các ghế này đang nằm trong một đơn chờ thanh toán khác.')
      );
      console.error(editingBookingId ? 'Cập nhật ghế trong đơn đặt vé thất bại' : 'Tạo đơn đặt vé thất bại', {
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
                Hàng chờ vào đặt ghế
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                Người đầu tiên vào ngay; mỗi người tiếp theo được vào chọn ghế sau người trước 1 phút.
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
                Đến giờ, bạn có thể chọn ghế và thanh toán mà không cần chờ người trước hoàn tất.
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

  const isProcessing = apiLoading && !holdingSeats && seats.length === 0;
  const isHolding = holdingSeats;

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
          {seatLoadFailed && !apiLoading ? (
            <EmptyState
              title="Không tải được sơ đồ ghế"
              description="Máy chủ đang gặp lỗi khi tải trạng thái ghế. Vui lòng thử lại sau ít giây."
              actionText="Thử lại"
              onAction={() => refreshSeats({ current: false })}
            />
          ) : seats.length === 0 && !apiLoading ? (
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
                py: { xs: 2.5, md: 3 },
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  mb: 2,
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 3,
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                  background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.52), rgba(15, 23, 42, 0.25))',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={900}>Tìm ghế nhóm tự động</Typography>
                      {seatSuggestion && (
                        <Chip
                          size="small"
                          color="info"
                          variant="outlined"
                          label={`${seatSuggestion.options.length} lựa chọn`}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      Chọn quy mô nhóm, xem phương án theo hàng rồi xác nhận để giữ ghế.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <FormControl size="small" sx={{ minWidth: 118 }}>
                      <Select
                        value={groupSeatCount}
                        onChange={(event) => {
                            const count = Number(event.target.value);
                            setGroupSeatCount(count);
                            setSeatSuggestion(null);
                            setSelectedGroupOption(null);
                          }}
                        disabled={suggestingSeats || apiLoading}
                        displayEmpty
                        aria-label="Số người trong nhóm"
                        sx={{
                          bgcolor: 'rgba(15, 23, 42, 0.58)',
                          fontWeight: 800,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                        }}
                      >
                        {GROUP_SEAT_COUNTS.map((count) => (
                          <MenuItem key={count} value={count}>{count} người</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      startIcon={suggestingSeats ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                      onClick={handleSuggestGroupSeats}
                      disabled={suggestingSeats || apiLoading || seats.length === 0}
                      sx={{
                        minHeight: 40,
                        px: { xs: 1.5, sm: 2.25 },
                        flex: { xs: 1, md: 'initial' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {suggestingSeats ? 'Đang tìm...' : 'Tìm phương án'}
                    </Button>
                  </Stack>
                </Stack>
                {seatSuggestion?.options?.length > 0 && (
                  <Stack spacing={1.25} sx={{ mt: 1.75, pt: 1.5, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={850}>
                        Chọn hàng để xem trước
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Chưa giữ ghế
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))',
                          xl: 'repeat(4, minmax(0, 1fr))',
                        },
                        gap: 1,
                      }}
                    >
                      {seatSuggestion.options.map((option, index) => {
                        const selected = selectedGroupOption?.rowName === option.rowName;
                        const labels = option.seats.map((seat) => seat.label).join(', ');
                        const firstSeat = option.seats[0]?.label;
                        const lastSeat = option.seats[option.seats.length - 1]?.label;
                        return (
                          <Paper
                            key={`${option.rowName}-${option.seats.map((seat) => seat.id).join('-')}`}
                            component="button"
                            type="button"
                            onClick={() => {
                              setSelectedGroupOption(option);
                              setSeatSuggestion((current) => ({ ...current, confirmedMessage: null }));
                            }}
                            disabled={holdingSeats || apiLoading}
                            title={labels}
                            sx={{
                              p: 1.25,
                              minWidth: 0,
                              textAlign: 'left',
                              color: 'text.primary',
                              bgcolor: selected ? 'rgba(34, 211, 238, 0.13)' : 'rgba(15, 23, 42, 0.38)',
                              border: '1px solid',
                              borderColor: selected ? '#22D3EE' : 'rgba(148, 163, 184, 0.18)',
                              borderRadius: 2,
                              cursor: 'pointer',
                              transition: 'border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease',
                              '&:hover': {
                                borderColor: selected ? '#22D3EE' : 'rgba(251, 191, 36, 0.55)',
                                bgcolor: selected ? 'rgba(34, 211, 238, 0.16)' : 'rgba(30, 41, 59, 0.70)',
                                transform: 'translateY(-1px)',
                              },
                              '&:disabled': { cursor: 'not-allowed', opacity: 0.55 },
                            }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
                              <Typography variant="subtitle2" fontWeight={900} color={selected ? 'info.main' : 'text.primary'}>
                                Hàng {option.rowName}
                              </Typography>
                              {index === 0 && <Chip size="small" color="primary" label="Tốt nhất" sx={{ height: 20 }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
                              {firstSeat}–{lastSeat} · {option.seatCapacity ?? option.seats.length} chỗ · {option.exactMatch ? 'liền nhau' : 'gần nhất'}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                      <Typography variant="body2" color={selectedGroupOption ? 'info.main' : 'text.secondary'} fontWeight={selectedGroupOption ? 700 : 500}>
                        {selectedGroupOption
                          ? `Đang xem trước hàng ${selectedGroupOption.rowName}: ${selectedGroupOption.seats.map((seat) => seat.label).join(', ')}`
                          : 'Chọn một phương án phía trên để xem ghế trên sơ đồ.'}
                      </Typography>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleConfirmGroupSeats}
                        disabled={!selectedGroupOption || holdingSeats || apiLoading}
                        sx={{ minWidth: 190, whiteSpace: 'nowrap' }}
                      >
                        {selectedGroupOption ? `Giữ ghế hàng ${selectedGroupOption.rowName}` : 'Xác nhận giữ ghế'}
                      </Button>
                    </Stack>
                    {seatSuggestion.confirmedMessage && (
                      <Alert severity="success" sx={{ py: 0 }}>{seatSuggestion.confirmedMessage}</Alert>
                    )}
                  </Stack>
                )}
              </Box>
              <SeatMap
                seats={seats}
                selectedSeats={selectedSeats}
                suggestedSeats={selectedGroupOption?.seats ?? []}
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
            proceedText={editingBookingId && selectedSeats.length === 0 ? 'Hủy booking' : editingBookingId ? 'Cập nhật ghế' : 'Tiếp tục thanh toán'}
            allowEmptyProceed={Boolean(editingBookingId)}
            disabled={(!editingBookingId && selectedSeats.length === 0) || apiLoading}
          />
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 3 }}>
        <BookingSidebar
          movie={movie}
          showtime={showtime}
          selectedSeats={selectedSeats}
          onProceed={handleProceed}
          proceedText={editingBookingId && selectedSeats.length === 0 ? 'Hủy booking' : editingBookingId ? 'Cập nhật ghế' : 'Tiếp tục thanh toán'}
          allowEmptyProceed={Boolean(editingBookingId)}
          disabled={(!editingBookingId && selectedSeats.length === 0) || apiLoading}
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
