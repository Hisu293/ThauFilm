import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import { memberIntelligenceService } from '../services/intelligenceService';

const medalColor = ['#ffc83d', '#cbd5e1', '#d58b52'];

export default function TopMovieFansWidget() {
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFans((await memberIntelligenceService.leaderboard() || []).slice(0, 3));
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

  return <Card sx={{ mb: 3, borderRadius: 4, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,193,7,.12), rgba(229,9,20,.06))' }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: 'rgba(255,193,7,.16)', color: '#ffc83d' }}><EmojiEventsRoundedIcon /></Box>
          <Box><Typography fontWeight={900}>Top Movie Fans</Typography><Typography variant="caption" color="text.secondary">Những người yêu phim nổi bật tháng này</Typography></Box>
        </Stack>
        <Chip size="small" label="TOP 3" sx={{ fontWeight: 900, bgcolor: 'rgba(255,193,7,.16)', color: '#ffc83d' }} />
      </Stack>
      {loading ? <Box textAlign="center" py={2}><CircularProgress size={26} /></Box>
        : error ? <Alert severity="warning" action={<Typography component="button" onClick={load} sx={{ border: 0, bgcolor: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>Thử lại</Typography>}>{error}</Alert>
          : fans.length === 0 ? <Typography color="text.secondary">Chưa có dữ liệu xếp hạng trong tháng này.</Typography>
            : <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>{fans.map((fan, index) => <Box key={fan.userId} sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: 3, bgcolor: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.07)' }}>
              <Typography fontWeight={1000} sx={{ color: medalColor[index], minWidth: 25 }}>#{fan.rank || index + 1}</Typography>
              <Avatar src={fan.avatarUrl} sx={{ width: 38, height: 38 }}>{fan.name?.[0]}</Avatar>
              <Box minWidth={0} flex={1}><Typography fontWeight={850} noWrap>{fan.name}</Typography><Stack direction="row" spacing={1} color="text.secondary"><Typography variant="caption" display="flex" alignItems="center" gap={.35}><LocalMoviesRoundedIcon sx={{ fontSize: 13 }} />{fan.movies}</Typography><Typography variant="caption" display="flex" alignItems="center" gap={.35}><ConfirmationNumberRoundedIcon sx={{ fontSize: 13 }} />{fan.tickets}</Typography></Stack></Box>
              <Typography variant="caption" fontWeight={900} color={medalColor[index]}>{fan.score}đ</Typography>
            </Box>)}</Stack>}
    </CardContent>
  </Card>;
}
