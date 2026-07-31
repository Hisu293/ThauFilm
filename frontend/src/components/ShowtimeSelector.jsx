import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Grid, Stack, Tab, Tabs, Typography } from '@mui/material';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

const formatDateTab = (dateStr, index) => {
  if (!dateStr) return { dayName: '', dateLabel: '' };
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { dayName: '', dateLabel: dateStr };

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayName = isToday
    ? 'Hôm nay'
    : date.toLocaleDateString('vi-VN', { weekday: 'short' });

  return {
    dayName: index === 0 && isToday ? 'Hôm nay' : dayName,
    dateLabel: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
  };
};

export const ShowtimeSelector = ({
  movieId,
  onSelectShowtime,
  onSelectOnlineShowtime,
  onCreateWatchParty,
  onlineLoadingShowtimeId,
  watchPartyLoading,
}) => {
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!movieId) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
    });

    bookingApi.fetchShowtimesByMovie(movieId)
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data ?? res ?? [];
        const normalized = bookingService
          .normalizeShowtimes(raw)
          .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
        setShowtimes(normalized);
        setSelectedDateIdx(0);
      })
      .catch((err) => {
        if (!cancelled) {
          setShowtimes([]);
          setError(err.message || 'Không tải được lịch chiếu.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [movieId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingShowtimes = useMemo(
    () => showtimes.filter((showtime) => {
      const startMs = new Date(showtime.startTime).getTime();
      return Number.isNaN(startMs) ? false : startMs > nowTs;
    }),
    [showtimes, nowTs],
  );

  const dates = useMemo(() => {
    return [...new Set(upcomingShowtimes.map((s) => s.date).filter(Boolean))].sort();
  }, [upcomingShowtimes]);

  const safeSelectedDateIdx = selectedDateIdx < dates.length ? selectedDateIdx : 0;
  const selectedDate = dates[safeSelectedDateIdx] || '';
  const dateShowtimes = selectedDate
    ? upcomingShowtimes.filter((s) => s.date === selectedDate)
    : upcomingShowtimes;

  const theaterGroups = useMemo(() => {
    const grouped = dateShowtimes.reduce((acc, showtime) => {
      if (showtime.startTime) {
        const showtimeMs = new Date(showtime.startTime).getTime();
        if (!Number.isNaN(showtimeMs) && showtimeMs <= nowTs) {
          return acc;
        }
      }

      const theaterName = showtime.online ? 'Online' : (showtime.theaterName || showtime.cinemaName || 'ThauFilm Cinema');
      const theaterKey = showtime.online ? 'online-showtimes' : (showtime.theaterId || theaterName || 'default-theater');
      if (!acc[theaterKey]) {
        acc[theaterKey] = {
          id: theaterKey,
          name: theaterName,
          showtimes: [],
        };
      }
      acc[theaterKey].showtimes.push(showtime);
      return acc;
    }, {});

    return Object.values(grouped).map((group) => ({
      ...group,
      showtimes: group.showtimes.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    }));
  }, [dateShowtimes, nowTs]);

  const handleTabChange = (_event, newValue) => {
    setSelectedDateIdx(newValue);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleRoundedIcon sx={{ color: 'primary.main' }} />
        Lịch Chiếu & Suất Chiếu
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {dates.length > 0 && (
        <Tabs
          value={safeSelectedDateIdx}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 4,
            '& .MuiTabs-flexContainer': {
              gap: 1.5,
            },
          }}
        >
          {dates.map((date, index) => {
            const tab = formatDateTab(date, index);
            return (
              <Tab
                key={date}
                label={
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', opacity: 0.7 }}>
                      {tab.dayName}
                    </Typography>
                    <Typography sx={{ fontSize: '1.2rem', fontWeight: 800 }}>
                      {tab.dateLabel}
                    </Typography>
                  </Box>
                }
                sx={{
                  minWidth: 90,
                  bgcolor: safeSelectedDateIdx === index ? 'primary.main' : 'background.paper',
                  color: safeSelectedDateIdx === index ? 'primary.contrastText' : 'text.secondary',
                  border: '1px solid rgba(148, 163, 184, 0.08)',
                  borderRadius: 2,
                  '&.Mui-selected': {
                    color: 'primary.contrastText',
                    bgcolor: 'primary.main',
                    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.25)',
                  },
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </Tabs>
      )}

      {loading ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Đang tải lịch chiếu...</Typography>
        </Card>
      ) : theaterGroups.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Rất tiếc, không tìm thấy suất chiếu nào cho ngày đã chọn.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {theaterGroups.map((group) => (
            <Card key={group.id} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.25, gap: 1.25, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    bgcolor: 'rgba(251, 191, 36, 0.12)',
                    color: 'primary.main',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LocationOnRoundedIcon sx={{ fontSize: 19 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25 }}>
                    {group.name}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {group.showtimes.length} suất chiếu hiện có
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                {group.showtimes.map((showtime) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={showtime.id}>
                    <Stack spacing={1}>
                      <Button
                        fullWidth
                        variant="outlined"
                          onClick={() => {
                            if (showtime.online && onSelectOnlineShowtime) {
                              onSelectOnlineShowtime(showtime);
                              return;
                            }
                            onSelectShowtime(showtime);
                          }}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          py: 1.7,
                          borderRadius: 2.5,
                          borderColor: 'rgba(148, 163, 184, 0.15)',
                          bgcolor: 'rgba(30, 41, 59, 0.4)',
                          color: 'text.primary',
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'rgba(251, 191, 36, 0.06)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.12)',
                          },
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {showtime.time}
                        </Typography>
                        {showtime.format && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.4, fontWeight: 700 }}>
                            {showtime.format}
                          </Typography>
                        )}
                      </Button>
                      {showtime.online && onSelectOnlineShowtime && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          startIcon={<PlayArrowRoundedIcon />}
                          disabled={onlineLoadingShowtimeId === showtime.id}
                          onClick={() => onSelectOnlineShowtime(showtime)}
                          sx={{ borderRadius: 2, fontWeight: 800, minHeight: 36 }}
                        >
                          {onlineLoadingShowtimeId === showtime.id ? 'Đang tạo...' : 'Mua online'}
                        </Button>
                      )}
                      {showtime.online && onCreateWatchParty && (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<GroupRoundedIcon />}
                          disabled={watchPartyLoading}
                          onClick={() => onCreateWatchParty(showtime)}
                          sx={{ borderRadius: 2, fontWeight: 800, minHeight: 36 }}
                        >
                          {watchPartyLoading ? 'Đang tạo phòng...' : `Xem nhóm · ${new Intl.NumberFormat('vi-VN').format(showtime.onlinePrice ?? 79000)}đ`}
                        </Button>
                      )}
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ShowtimeSelector;
