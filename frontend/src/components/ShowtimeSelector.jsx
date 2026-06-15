import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Grid, Button, Stack, Chip, Card, CardContent } from '@mui/material';
import { getActiveDates, getShowtimesForMovieAndDate } from '../mock/bookingData';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import StatusChip from './common/StatusChip';

export const ShowtimeSelector = ({ movieId, onSelectShowtime }) => {
  const dates = getActiveDates();
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [showtimes, setShowtimes] = useState([]);

  useEffect(() => {
    if (movieId && dates.length > 0) {
      const activeDate = dates[selectedDateIdx];
      const items = getShowtimesForMovieAndDate(movieId, activeDate.id);
      setShowtimes(items);
    }
  }, [movieId, selectedDateIdx]);

  // Group showtimes by format (2D, 3D, IMAX 2D)
  const groupedShowtimes = showtimes.reduce((acc, st) => {
    if (!acc[st.format]) {
      acc[st.format] = [];
    }
    acc[st.format].push(st);
    return acc;
  }, {});

  const handleTabChange = (event, newValue) => {
    setSelectedDateIdx(newValue);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleRoundedIcon sx={{ color: 'primary.main' }} />
        Lịch Chiếu & Suất Chiếu
      </Typography>

      {/* Date tabs */}
      <Tabs
        value={selectedDateIdx}
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
        {dates.map((date, index) => (
          <Tab
            key={date.id}
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', opacity: 0.7 }}>
                  {date.dayName}
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {date.dateStr}
                </Typography>
              </Box>
            }
            sx={{
              minWidth: 90,
              bgcolor: selectedDateIdx === index ? 'primary.main' : 'background.paper',
              color: selectedDateIdx === index ? 'primary.contrastText' : 'text.secondary',
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
        ))}
      </Tabs>

      {/* Showtimes listing */}
      {Object.keys(groupedShowtimes).length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Rất tiếc, không tìm thấy suất chiếu nào cho ngày đã chọn.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {Object.entries(groupedShowtimes).map(([format, list]) => (
            <Card key={format} sx={{ p: 2.5, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
                <StatusChip label={format} type="format" sx={{ px: 1.5, py: 1.8, fontSize: '0.85rem' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  {list.length} suất chiếu
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {list.map((st) => (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={st.id}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => onSelectShowtime(st)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        py: 1.8,
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
                        {st.time}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                        <MeetingRoomRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {st.room}
                        </Typography>
                      </Stack>
                    </Button>
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
