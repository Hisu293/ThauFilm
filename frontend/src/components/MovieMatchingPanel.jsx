import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  FormControlLabel, IconButton, LinearProgress, Paper, Stack, Switch, Tab, Tabs,
  TextField, Tooltip, Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { memberIntelligenceService } from '../services/intelligenceService';
import MatchRoomDialog from './MatchRoomDialog';
import { connectRealtime } from '../services/realtimeService';

const emptyForm = { bio: '', favoriteGenres: '', preferredTheater: '', availableTimes: '', active: false };
const toForm = (profile) => ({
  bio: profile?.bio || '', favoriteGenres: (profile?.favoriteGenres || []).join(', '),
  preferredTheater: profile?.preferredTheater || '', availableTimes: profile?.availableTimes || '',
  active: Boolean(profile?.active),
});
const splitGenres = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const firstLetter = (name) => (name || 'T').trim()[0]?.toUpperCase();

const DatingPhoto = ({ person, height = 520 }) => (
  <Box sx={{ height, position: 'relative', overflow: 'hidden', bgcolor: '#191724' }}>
    {person.avatarUrl ? (
      <Box component="img" src={person.avatarUrl} alt={person.fullName || 'Hồ sơ hẹn hò'}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
    ) : (
      <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', background: 'linear-gradient(145deg, #362b58, #8b315d)' }}>
        <Avatar sx={{ width: 132, height: 132, fontSize: 56, bgcolor: 'rgba(255,255,255,.16)' }}>{firstLetter(person.fullName)}</Avatar>
      </Stack>
    )}
    <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(8,7,13,.92) 100%)' }} />
  </Box>
);

const ProfileDetails = ({ person }) => (
  <Stack spacing={1.25}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="h4" fontWeight={900}>{person.fullName || 'Thành viên'}</Typography>
      <Chip icon={<AutoAwesomeRoundedIcon />} label={`${person.compatibilityPercent || 0}% hợp gu`}
        sx={{ bgcolor: 'rgba(255,64,129,.16)', color: '#ff8ab2', fontWeight: 800 }} />
    </Stack>
    <Typography sx={{ color: 'rgba(255,255,255,.76)', lineHeight: 1.6 }}>
      {person.bio || 'Người này chưa viết lời giới thiệu.'}
    </Typography>
    <Stack direction="row" gap={0.75} flexWrap="wrap">
      {(person.favoriteGenres || []).map((genre) => <Chip key={genre} size="small" label={genre} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,.12)' }} />)}
    </Stack>
    {(person.preferredTheater || person.availableTimes) && <Stack spacing={0.5} pt={0.5}>
      {person.preferredTheater && <Typography variant="body2" color="rgba(255,255,255,.72)"><b>Rạp yêu thích:</b> {person.preferredTheater}</Typography>}
      {person.availableTimes && <Typography variant="body2" color="rgba(255,255,255,.72)"><b>Thường rảnh:</b> {person.availableTimes}</Typography>}
    </Stack>}
  </Stack>
);

const SwipeCard = ({ person, nextPerson, busy, onDecision }) => {
  const [drag, setDrag] = useState({ active: false, startX: 0, x: 0 });
  const offset = drag.x;
  const rotation = Math.max(-11, Math.min(11, offset / 20));

  const finishDrag = () => {
    if (!drag.active) return;
    if (Math.abs(offset) >= 90 && !busy) onDecision(offset > 0 ? 'LIKE' : 'PASS');
    setDrag({ active: false, startX: 0, x: 0 });
  };

  return <Box sx={{ width: '100%', maxWidth: 470, height: { xs: 610, sm: 690 }, position: 'relative' }}>
    {nextPerson && <Paper elevation={4} sx={{ position: 'absolute', inset: '18px 14px -2px', borderRadius: 6, bgcolor: '#211e2c', transform: 'scale(.96)' }} />}
    <Card
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ active: true, startX: event.clientX, x: 0 }); }}
      onPointerMove={(event) => drag.active && setDrag((value) => ({ ...value, x: event.clientX - value.startX }))}
      onPointerUp={finishDrag} onPointerCancel={finishDrag}
      sx={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden', bgcolor: '#111019', color: 'white',
        cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'pan-y', userSelect: 'none',
        transform: `translateX(${offset}px) rotate(${rotation}deg)`, transition: drag.active ? 'none' : 'transform .24s ease',
        opacity: busy ? .62 : 1, boxShadow: '0 28px 80px rgba(0,0,0,.38)' }}>
      <DatingPhoto person={person} height="100%" />
      {Math.abs(offset) > 25 && <Box sx={{ position: 'absolute', top: 34, [offset > 0 ? 'left' : 'right']: 28, px: 2, py: .6,
        border: '4px solid', borderColor: offset > 0 ? '#45e6a8' : '#ff5c7c', color: offset > 0 ? '#45e6a8' : '#ff5c7c',
        borderRadius: 2, fontWeight: 1000, fontSize: 25, transform: `rotate(${offset > 0 ? -10 : 10}deg)` }}>
        {offset > 0 ? 'THÍCH' : 'BỎ QUA'}
      </Box>}
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: { xs: 2.5, sm: 3.5 }, pb: { xs: 10.5, sm: 11 } }}>
        <ProfileDetails person={person} />
      </Box>
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={3}
        sx={{ position: 'absolute', left: 0, right: 0, bottom: 18 }}>
        <Tooltip title="Bỏ qua (hoặc vuốt trái)"><span><IconButton disabled={busy} onClick={(event) => { event.stopPropagation(); onDecision('PASS'); }}
          sx={{ width: 62, height: 62, bgcolor: 'white', color: '#f04f73', boxShadow: 5, '&:hover': { bgcolor: '#fff1f4' } }}><CloseRoundedIcon fontSize="large" /></IconButton></span></Tooltip>
        <Tooltip title="Thích (hoặc vuốt phải)"><span><IconButton disabled={busy} onClick={(event) => { event.stopPropagation(); onDecision('LIKE'); }}
          sx={{ width: 72, height: 72, bgcolor: '#ff3f81', color: 'white', boxShadow: '0 8px 28px rgba(255,63,129,.45)', '&:hover': { bgcolor: '#ec2f70' } }}><FavoriteRoundedIcon fontSize="large" /></IconButton></span></Tooltip>
      </Stack>
      {busy && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
    </Card>
  </Box>;
};

const PassedCard = ({ person, busy, onRestore }) => <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
  <Box sx={{ position: 'relative', height: 210 }}><DatingPhoto person={person} height={210} />
    <Typography variant="h6" fontWeight={900} color="white" sx={{ position: 'absolute', left: 18, bottom: 14 }}>{person.fullName}</Typography>
  </Box>
  <CardContent>
    <Stack direction="row" gap={0.5} flexWrap="wrap" mb={2}>{(person.favoriteGenres || []).slice(0, 3).map((genre) => <Chip key={genre} size="small" label={genre} />)}</Stack>
    <Button fullWidth variant="outlined" startIcon={<ReplayRoundedIcon />} disabled={busy} onClick={onRestore}>Đưa lại vào khám phá</Button>
  </CardContent>
</Card>;

const MatchCard = ({ match, onOpen }) => {
  const person = match.person || {};
  return <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
    <Box sx={{ position: 'relative', height: 230 }}><DatingPhoto person={person} height={230} />
      <Box sx={{ position: 'absolute', left: 18, right: 18, bottom: 14 }}><Typography variant="h6" fontWeight={900} color="white">{person.fullName || 'Thành viên'}</Typography><Typography variant="caption" color="rgba(255,255,255,.75)">{person.compatibilityPercent || 0}% hợp gu</Typography></Box>
    </Box>
    <CardContent><Button fullWidth variant="contained" startIcon={<ChatBubbleRoundedIcon />} onClick={onOpen}>Nhắn tin & hẹn xem phim</Button>
      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1}>Match ngày {new Date(match.matchedAt).toLocaleDateString('vi-VN')}</Typography>
    </CardContent>
  </Card>;
};

export default function MovieMatchingPanel() {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [candidates, setCandidates] = useState([]);
  const [passed, setPassed] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const photoInput = useRef(null);

  const showError = (err) => setError(err?.message || 'Không thể thực hiện thao tác.');
  const loadProfile = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await memberIntelligenceService.matchingProfile(); setProfile(result); setForm(toForm(result)); }
    catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  const loadCandidates = useCallback(async () => {
    setLoading(true); setError('');
    try { setCandidates(await memberIntelligenceService.matchingCandidates() || []); }
    catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  const loadPassed = useCallback(async () => {
    setLoading(true); setError('');
    try { setPassed(await memberIntelligenceService.passedMatchingCandidates() || []); }
    catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  const loadMatches = useCallback(async () => {
    setLoading(true); setError('');
    try { const items = await memberIntelligenceService.matches() || []; setMatches(items); return items; }
    catch (err) { showError(err); return []; } finally { setLoading(false); }
  }, []);

  useEffect(() => connectRealtime({ onEvent: async (event) => {
    const isMatchEvent = event.type === 'MOVIE_MATCH' || (event.type === 'NOTIFICATION' && event.data?.notificationType === 'MOVIE_MATCH');
    if (!isMatchEvent) return;
    const items = await memberIntelligenceService.matches().catch(() => []);
    setMatches(items); setTab(3);
    const matched = items.find((item) => String(item.matchId) === String(event.data?.matchId));
    if (matched) setSelectedMatch(matched);
    setNotice('Bạn có match mới! Phòng trò chuyện đã sẵn sàng.');
  } }), []);

  const save = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await memberIntelligenceService.saveMatchingProfile({ ...form, favoriteGenres: splitGenres(form.favoriteGenres) });
      setProfile(result); setForm(toForm(result)); setNotice('Đã lưu hồ sơ Movie Dating.');
    } catch (err) { showError(err); } finally { setLoading(false); }
  };
  const uploadPhoto = async (event) => {
    const image = event.target.files?.[0]; event.target.value = '';
    if (!image) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size > 8 * 1024 * 1024) {
      setError('Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 8 MB.'); return;
    }
    setLoading(true); setError('');
    try { const result = await memberIntelligenceService.uploadMatchingPhoto(image); setProfile(result); setNotice('Đã cập nhật ảnh hồ sơ hẹn hò.'); }
    catch (err) { showError(err); } finally { setLoading(false); }
  };
  const removePhoto = async () => {
    setLoading(true); setError('');
    try { const result = await memberIntelligenceService.removeMatchingPhoto(); setProfile(result); setNotice('Đã gỡ ảnh hẹn hò.'); }
    catch (err) { showError(err); } finally { setLoading(false); }
  };
  const act = async (person, decision) => {
    setBusyId(person.userId); setError(''); setNotice('');
    try {
      const result = await memberIntelligenceService.matchingAction(person.userId, decision);
      setCandidates((items) => items.filter((item) => item.userId !== person.userId));
      if (decision === 'PASS') setPassed((items) => [{ ...person, lastInteractedAt: new Date().toISOString() }, ...items.filter((item) => item.userId !== person.userId)]);
      setNotice(result?.matched ? `Bạn và ${person.fullName} đã match!` : decision === 'LIKE' ? 'Đã gửi lượt thích.' : `Đã bỏ qua ${person.fullName}. Bạn có thể hoàn tác trong mục Đã bỏ qua.`);
      if (result?.matched) {
        const items = await loadMatches(); setTab(3);
        const matched = items.find((item) => String(item.matchId) === String(result.matchId));
        if (matched) setSelectedMatch(matched);
      }
    } catch (err) { showError(err); } finally { setBusyId(null); }
  };
  const restore = async (person) => {
    setBusyId(person.userId); setError('');
    try {
      await memberIntelligenceService.restoreMatchingCandidate(person.userId);
      setPassed((items) => items.filter((item) => item.userId !== person.userId));
      setCandidates((items) => [person, ...items.filter((item) => item.userId !== person.userId)]);
      setNotice(`${person.fullName} đã trở lại danh sách khám phá.`);
    } catch (err) { showError(err); } finally { setBusyId(null); }
  };
  const changeTab = (_, value) => {
    setTab(value); setError(''); setNotice('');
    if (value === 1 && profile?.active) loadCandidates();
    if (value === 2) loadPassed();
    if (value === 3) loadMatches();
  };
  const handleMatchEnded = useCallback(async () => { await loadMatches(); if (profile?.active) await loadCandidates(); }, [loadMatches, loadCandidates, profile?.active]);

  const activePerson = candidates[0];
  return <Box sx={{ borderRadius: { md: 6 }, p: { xs: 1, md: 3 }, background: 'radial-gradient(circle at 20% 0%, rgba(255,63,129,.13), transparent 32%), linear-gradient(145deg, rgba(23,20,34,.98), rgba(12,11,18,.98))' }}>
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1}>
        <Box><Typography variant="h4" fontWeight={1000} color="white">Movie Dating</Typography><Typography color="rgba(255,255,255,.62)">Một bộ phim hay có thể là khởi đầu của một câu chuyện đẹp.</Typography></Box>
        <Chip icon={<LocalMoviesRoundedIcon />} label="Chỉ match khi cả hai cùng thích" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,.1)' }} />
      </Stack>
      <Tabs value={tab} onChange={changeTab} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTab-root': { color: 'rgba(255,255,255,.56)', fontWeight: 800 }, '& .Mui-selected': { color: '#ff6b9d !important' } }}>
        <Tab label="Hồ sơ của tôi" /><Tab label={`Khám phá${candidates.length ? ` (${candidates.length})` : ''}`} /><Tab label={`Đã bỏ qua${passed.length ? ` (${passed.length})` : ''}`} /><Tab label={`Đã match${matches.length ? ` (${matches.length})` : ''}`} />
      </Tabs>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading ? <Box textAlign="center" py={9}><CircularProgress color="secondary" /></Box> : <>
        {tab === 0 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .75fr) 1.4fr' }, gap: 3 }}>
          <Card sx={{ borderRadius: 5, overflow: 'hidden', minHeight: 420, position: 'relative' }}>
            <DatingPhoto person={profile || {}} height={420} />
            <Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 18, bottom: 18 }}>
              <Button variant="contained" startIcon={<PhotoCameraRoundedIcon />} onClick={() => photoInput.current?.click()}>Chọn ảnh</Button>
              {profile?.customDatingPhoto && <IconButton aria-label="Gỡ ảnh hẹn hò" onClick={removePhoto} sx={{ bgcolor: 'rgba(0,0,0,.62)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}><DeleteOutlineRoundedIcon /></IconButton>}
            </Stack>
            <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
          </Card>
          <Card sx={{ borderRadius: 5 }}><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h5" fontWeight={900} mb={.5}>Hồ sơ hẹn hò của bạn</Typography><Typography color="text.secondary" mb={3}>Ảnh rõ mặt và vài dòng chân thật sẽ giúp bạn dễ tìm được người hợp gu hơn.</Typography>
            <Stack spacing={2}><TextField label="Giới thiệu bản thân" multiline minRows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} inputProps={{ maxLength: 500 }} />
              <TextField label="Thể loại yêu thích" helperText="Ngăn cách bằng dấu phẩy, ví dụ: Marvel, Anime, Tâm lý" value={form.favoriteGenres} onChange={(e) => setForm({ ...form, favoriteGenres: e.target.value })} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}><TextField label="Rạp yêu thích" value={form.preferredTheater} onChange={(e) => setForm({ ...form, preferredTheater: e.target.value })} /><TextField label="Thời gian thường rảnh" placeholder="Tối thứ 7, Chủ nhật" value={form.availableTimes} onChange={(e) => setForm({ ...form, availableTimes: e.target.value })} /></Box>
              <Divider /><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}><FormControlLabel control={<Switch color="secondary" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label="Cho phép người khác khám phá hồ sơ" /><Button variant="contained" color="secondary" startIcon={<SaveRoundedIcon />} onClick={save}>Lưu hồ sơ</Button></Stack>
            </Stack>
          </CardContent></Card>
        </Box>}
        {tab === 1 && (!profile?.active ? <Alert severity="warning" action={<Button onClick={() => setTab(0)}>Mở hồ sơ</Button>}>Hãy bật hồ sơ hẹn hò trước khi khám phá.</Alert> : !activePerson ? <Paper sx={{ py: 9, px: 3, textAlign: 'center', borderRadius: 5 }}><AutoAwesomeRoundedIcon color="secondary" sx={{ fontSize: 54 }} /><Typography variant="h5" fontWeight={900} mt={1}>Bạn đã xem hết hồ sơ mới</Typography><Typography color="text.secondary" mt={1} mb={2}>Quay lại sau hoặc khôi phục một người trong mục Đã bỏ qua.</Typography><Button startIcon={<ReplayRoundedIcon />} onClick={loadCandidates}>Tải lại</Button></Paper> : <Stack alignItems="center" spacing={2}><SwipeCard key={activePerson.userId} person={activePerson} nextPerson={candidates[1]} busy={busyId === activePerson.userId} onDecision={(decision) => act(activePerson, decision)} /><Typography variant="caption" color="rgba(255,255,255,.5)">Vuốt trái để bỏ qua · Vuốt phải để thích</Typography></Stack>)}
        {tab === 2 && (passed.length === 0 ? <Paper sx={{ py: 8, px: 3, textAlign: 'center', borderRadius: 5 }}><ReplayRoundedIcon color="secondary" sx={{ fontSize: 52 }} /><Typography variant="h6" fontWeight={900}>Chưa có hồ sơ nào bị bỏ qua</Typography><Typography color="text.secondary">Những người bạn vuốt trái sẽ xuất hiện ở đây để có thể hoàn tác.</Typography></Paper> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>{passed.map((person) => <PassedCard key={person.userId} person={person} busy={busyId === person.userId} onRestore={() => restore(person)} />)}</Box>)}
        {tab === 3 && (matches.length === 0 ? <Alert severity="info">Khi hai người cùng thích nhau, match sẽ xuất hiện tại đây.</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>{matches.map((match) => <MatchCard key={match.matchId} match={match} onOpen={() => setSelectedMatch(match)} />)}</Box>)}
      </>}
      <MatchRoomDialog match={selectedMatch} open={Boolean(selectedMatch)} onClose={() => setSelectedMatch(null)} onMatchEnded={handleMatchEnded} />
    </Stack>
  </Box>;
}
