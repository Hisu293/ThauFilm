import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container, LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import { memberIntelligenceService } from '../services/intelligenceService';
import MovieMatchingPanel from '../components/MovieMatchingPanel';

export default function CinemaIntelligencePage() {
  const [tab, setTab] = useState(0); const [leaderboard, setLeaderboard] = useState([]); const [achievements, setAchievements] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [fans, badges] = await Promise.all([memberIntelligenceService.leaderboard(), memberIntelligenceService.achievements()]); setLeaderboard(fans || []); setAchievements(badges); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  return <Container maxWidth="lg" sx={{ py: 5, minHeight: '75vh' }}><Typography variant="h3" fontWeight={900}>Cinema Intelligence</Typography><Typography color="text.secondary" mb={3}>Khám phá độ hợp gu, thành tích và bảng xếp hạng cộng đồng.</Typography>
    <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}><Tab icon={<EmojiEventsRoundedIcon />} iconPosition="start" label="Top Movie Fans" /><Tab icon={<MilitaryTechRoundedIcon />} iconPosition="start" label="Achievements" /><Tab icon={<FavoriteRoundedIcon />} iconPosition="start" label="Movie Dating" /></Tabs>
    {tab === 2 ? <MovieMatchingPanel /> : loading ? <Box textAlign="center" py={8}><CircularProgress /></Box> : error ? <Alert severity="error" action={<Button onClick={load}>Thử lại</Button>}>{error}</Alert> : <>{tab === 0 && <Leaderboard items={leaderboard} />}{tab === 1 && <Achievements data={achievements} />}</>}
  </Container>;
}

const Leaderboard = ({ items }) => <Stack spacing={1.5}>{items.length === 0 ? <Alert severity="info">Tháng này chưa có người xem nào trên bảng xếp hạng.</Alert> : items.map(item => <Card key={item.userId}><CardContent><Stack direction="row" alignItems="center" spacing={2}><Typography variant="h5" fontWeight={900} color={item.rank <= 3 ? 'primary.main' : 'text.secondary'}>#{item.rank}</Typography><Avatar src={item.avatarUrl}>{item.name?.[0]}</Avatar><Box flex={1}><Typography fontWeight={800}>{item.name}</Typography><Typography variant="body2" color="text.secondary">{item.movies} phim · {item.tickets} vé trong tháng</Typography></Box><Chip label={`${item.score} điểm`} color={item.rank <= 3 ? 'primary' : 'default'} /></Stack></CardContent></Card>)}</Stack>;

const Achievements = ({ data }) => <><Card sx={{ mb: 3, background: 'linear-gradient(135deg,rgba(251,191,36,.18),rgba(229,9,20,.12))' }}><CardContent><Typography variant="overline">LEVEL {data?.level}</Typography><Typography variant="h4" fontWeight={900}>{data?.levelName}</Typography><Typography color="text.secondary">{data?.points} điểm · {data?.uniqueMovies} phim · {data?.tickets} vé</Typography></CardContent></Card><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{(data?.achievements || []).map(item => <Card key={item.code} sx={{ opacity: item.unlocked ? 1 : .62 }}><CardContent><Stack direction="row" justifyContent="space-between"><Typography variant="h6" fontWeight={800}>{item.unlocked ? '🏆' : '🔒'} {item.name}</Typography><Chip size="small" label={`+${item.points}`} /></Stack><Typography variant="body2" color="text.secondary" mb={2}>{item.description}</Typography><LinearProgress variant="determinate" value={item.progress / item.target * 100} /><Typography variant="caption">{item.progress}/{item.target}</Typography></CardContent></Card>)}</Box></>;
