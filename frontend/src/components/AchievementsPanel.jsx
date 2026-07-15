import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { memberIntelligenceService } from '../services/intelligenceService';

export default function AchievementsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await memberIntelligenceService.achievements()); setError(''); }
    catch (requestError) { setError(requestError.message || 'Không thể tải huy hiệu.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <Box textAlign="center" py={8}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" action={<Typography component="button" onClick={load} sx={{ border: 0, bgcolor: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>Thử lại</Typography>}>{error}</Alert>;

  return <Stack spacing={2.5}>
    <Card sx={{ borderRadius: 4, background: 'linear-gradient(135deg, rgba(255,193,7,.18), rgba(229,9,20,.12))' }}><CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Stack direction="row" spacing={2} alignItems="center"><Box sx={{ width: 62, height: 62, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,193,7,.16)', color: '#ffc83d' }}><WorkspacePremiumRoundedIcon sx={{ fontSize: 36 }} /></Box><Box><Typography variant="overline" color="text.secondary">CẤP ĐỘ {data?.level || 1}</Typography><Typography variant="h4" fontWeight={950}>{data?.levelName || 'Movie Fan'}</Typography></Box></Stack>
        <Stack direction="row" spacing={1}><Chip label={`${data?.points || 0} điểm`} color="warning" /><Chip variant="outlined" label={`${data?.uniqueMovies || 0} phim · ${data?.tickets || 0} vé`} /></Stack>
      </Stack>
    </CardContent></Card>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      {(data?.achievements || []).map((item) => {
        const percent = item.target ? Math.min(100, Math.round((item.progress || 0) * 100 / item.target)) : 0;
        return <Card key={item.code} sx={{ borderRadius: 4, opacity: item.unlocked ? 1 : .68, border: item.unlocked ? '1px solid rgba(255,193,7,.3)' : undefined }}><CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}><Stack direction="row" spacing={1.2} alignItems="center">{item.unlocked ? <MilitaryTechRoundedIcon sx={{ color: '#ffc83d', fontSize: 30 }} /> : <LockRoundedIcon color="disabled" />}<Box><Typography fontWeight={900}>{item.name}</Typography><Typography variant="caption" color="text.secondary">{item.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}</Typography></Box></Stack><Chip size="small" label={`+${item.points} điểm`} /></Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>{item.description}</Typography>
          <LinearProgress variant="determinate" value={percent} color={item.unlocked ? 'warning' : 'inherit'} sx={{ height: 7, borderRadius: 10 }} />
          <Typography variant="caption" color="text.secondary" display="block" textAlign="right" mt={.75}>{item.progress}/{item.target}</Typography>
        </CardContent></Card>;
      })}
    </Box>
  </Stack>;
}
