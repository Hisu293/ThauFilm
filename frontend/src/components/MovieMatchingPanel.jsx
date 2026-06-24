import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { memberIntelligenceService } from '../services/intelligenceService';

const emptyForm = { bio: '', favoriteGenres: '', preferredTheater: '', availableTimes: '', active: false };
const toForm = (profile) => ({
  bio: profile?.bio || '', favoriteGenres: (profile?.favoriteGenres || []).join(', '),
  preferredTheater: profile?.preferredTheater || '', availableTimes: profile?.availableTimes || '', active: Boolean(profile?.active),
});
const splitGenres = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const PersonCard = ({ person, actions }) => <Card sx={{ height: '100%' }}><CardContent>
  <Stack direction="row" spacing={2} alignItems="center" mb={2}><Avatar src={person.avatarUrl} sx={{ width: 64, height: 64 }}>{(person.fullName || 'T')[0]}</Avatar><Box flex={1}><Typography variant="h6" fontWeight={900}>{person.fullName || 'Thành viên'}</Typography><Chip color="success" size="small" label={`${person.compatibilityPercent}% hợp gu`} /></Box></Stack>
  <Typography color="text.secondary" mb={2}>{person.bio || 'Chưa có lời giới thiệu.'}</Typography>
  <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>{(person.favoriteGenres || []).map((genre) => <Chip key={genre} label={genre} size="small" />)}</Stack>
  {person.preferredTheater && <Typography variant="body2"><b>Rạp ưu tiên:</b> {person.preferredTheater}</Typography>}
  {person.availableTimes && <Typography variant="body2"><b>Thời gian rảnh:</b> {person.availableTimes}</Typography>}
  {actions && <Stack direction="row" spacing={1.5} mt={3}><Button fullWidth variant="outlined" color="inherit" startIcon={<CloseRoundedIcon />} onClick={actions.pass}>Bỏ qua</Button><Button fullWidth variant="contained" startIcon={<FavoriteRoundedIcon />} onClick={actions.like}>Thích</Button></Stack>}
</CardContent></Card>;

export default function MovieMatchingPanel() {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [candidates, setCandidates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await memberIntelligenceService.matchingProfile(); setProfile(result); setForm(toForm(result)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  const save = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await memberIntelligenceService.saveMatchingProfile({ ...form, favoriteGenres: splitGenres(form.favoriteGenres) });
      setProfile(result); setForm(toForm(result)); setNotice('Đã lưu hồ sơ Movie Dating.');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const loadCandidates = useCallback(async () => {
    setLoading(true); setError(''); setNotice('');
    try { setCandidates(await memberIntelligenceService.matchingCandidates() || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  const loadMatches = useCallback(async () => {
    setLoading(true); setError(''); setNotice('');
    try { setMatches(await memberIntelligenceService.matches() || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  const changeTab = (_, value) => { setTab(value); if (value === 1 && profile?.active) loadCandidates(); if (value === 2) loadMatches(); };
  const act = async (person, decision) => {
    setBusyId(person.userId); setError(''); setNotice('');
    try {
      const result = await memberIntelligenceService.matchingAction(person.userId, decision);
      setCandidates((items) => items.filter((item) => item.userId !== person.userId));
      setNotice(result?.matched ? `Bạn và ${person.fullName} đã match!` : decision === 'LIKE' ? 'Đã gửi lượt thích.' : 'Đã bỏ qua.');
    } catch (err) { setError(err.message); } finally { setBusyId(null); }
  };

  return <Stack spacing={2.5}>
    <Alert severity="info">Movie Dating online chỉ tạo match khi cả hai người cùng bấm Thích.</Alert>
    <Tabs value={tab} onChange={changeTab} variant="scrollable"><Tab label="Hồ sơ của tôi" /><Tab label="Khám phá" /><Tab label={`Đã match${matches.length ? ` (${matches.length})` : ''}`} /></Tabs>
    {error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    {loading ? <Box textAlign="center" py={6}><CircularProgress /></Box> : <>
      {tab === 0 && <Card><CardContent><Typography variant="h5" fontWeight={900} mb={2}>Hồ sơ tìm bạn xem phim</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}><TextField label="Giới thiệu" multiline minRows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} inputProps={{ maxLength: 500 }} /><TextField label="Thể loại yêu thích" helperText="Ngăn cách bằng dấu phẩy, ví dụ: Marvel, Anime" value={form.favoriteGenres} onChange={(e) => setForm({ ...form, favoriteGenres: e.target.value })} /><TextField label="Rạp ưu tiên" value={form.preferredTheater} onChange={(e) => setForm({ ...form, preferredTheater: e.target.value })} /><TextField label="Thời gian rảnh" placeholder="Ví dụ: Tối thứ 7, Chủ nhật" value={form.availableTimes} onChange={(e) => setForm({ ...form, availableTimes: e.target.value })} /></Box><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mt={3} gap={2}><FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label="Đang tìm bạn xem phim" /><Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save}>Lưu hồ sơ</Button></Stack></CardContent></Card>}
      {tab === 1 && (!profile?.active ? <Alert severity="warning" action={<Button onClick={() => setTab(0)}>Mở hồ sơ</Button>}>Bạn cần bật “Đang tìm bạn xem phim” trong hồ sơ.</Alert> : candidates.length === 0 ? <Alert severity="info" action={<Button onClick={loadCandidates}>Tải lại</Button>}>Hiện chưa còn hồ sơ phù hợp để khám phá.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{candidates.map((person) => <Box key={person.userId} sx={{ opacity: busyId === person.userId ? 0.55 : 1, pointerEvents: busyId ? 'none' : 'auto' }}><PersonCard person={person} actions={{ pass: () => act(person, 'PASS'), like: () => act(person, 'LIKE') }} /></Box>)}</Box>)}
      {tab === 2 && (matches.length === 0 ? <Alert severity="info">Bạn chưa có match nào. Khi hai người cùng thích nhau, match sẽ xuất hiện tại đây.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{matches.map((match) => <Box key={match.matchId}><PersonCard person={match.person} /><Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Match ngày {new Date(match.matchedAt).toLocaleDateString('vi-VN')}</Typography></Box>)}</Box>)}
    </>}
  </Stack>;
}
