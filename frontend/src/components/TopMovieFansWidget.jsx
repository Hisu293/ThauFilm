import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import { memberIntelligenceService } from '../services/intelligenceService';

const rankColor = ['#ffc83d', '#cbd5e1', '#d58b52'];

export default function TopMovieFansWidget() {
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFans((await memberIntelligenceService.leaderboard() || []).slice(0, 10));
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return <Card sx={{ borderRadius: 4, overflow: 'hidden', background: 'linear-gradient(160deg, rgba(255,193,7,.12), rgba(229,9,20,.055) 46%, rgba(15,23,42,.4))' }}>
    <CardContent sx={{ p: 2.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Stack direction="row" spacing={1.1} alignItems="center"><Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: 'rgba(255,193,7,.16)', color: '#ffc83d' }}><EmojiEventsRoundedIcon /></Box><Box><Typography fontWeight={950}>Top Movie Fans</Typography><Typography variant="caption" color="text.secondary">Nổi bật trong tháng</Typography></Box></Stack>
        <Chip size="small" label="TOP 10" sx={{ fontWeight: 900, bgcolor: 'rgba(255,193,7,.14)', color: '#ffc83d' }} />
      </Stack>
      <Divider sx={{ mb: 1 }} />
      {loading ? <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
        : error ? <Alert severity="warning" onClick={load} sx={{ cursor: 'pointer' }}>{error}</Alert>
          : fans.length === 0 ? <Typography color="text.secondary" py={2}>Chưa có dữ liệu xếp hạng.</Typography>
            : <Stack>{fans.map((fan, index) => <Stack key={fan.userId} direction="row" alignItems="center" spacing={1.1} sx={{ py: 1.05, borderBottom: index < fans.length - 1 ? '1px solid rgba(148,163,184,.1)' : 0 }}>
              <Typography fontWeight={1000} sx={{ width: 25, color: rankColor[index] || 'text.secondary' }}>#{fan.rank || index + 1}</Typography>
              <Avatar src={fan.avatarUrl} sx={{ width: 38, height: 38, bgcolor: index < 3 ? 'rgba(255,193,7,.2)' : 'action.hover' }}>{fan.name?.[0]}</Avatar>
              <Box minWidth={0} flex={1}><Typography fontWeight={850} noWrap>{fan.name || 'Thành viên'}</Typography><Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={.4}><LocalMoviesRoundedIcon sx={{ fontSize: 13 }} />{fan.movies || 0} phim · {fan.tickets || 0} vé</Typography></Box>
              <Typography variant="caption" fontWeight={900} color={rankColor[index] || 'text.secondary'}>{fan.score || 0}đ</Typography>
            </Stack>)}</Stack>}
    </CardContent>
  </Card>;
}
