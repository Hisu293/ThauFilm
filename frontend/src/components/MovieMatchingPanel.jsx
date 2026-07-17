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
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import { memberIntelligenceService } from '../services/intelligenceService';
import MatchRoomDialog from './MatchRoomDialog';
import { connectRealtime } from '../services/realtimeService';

const ACCENT = '#FBBF24';
const ACCENT_DARK = '#D97706';
const ACCENT_SOFT = 'rgba(251, 191, 36, .14)';
const SURFACE = '#1E293B';
const SURFACE_DARK = '#111827';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const BORDER = 'rgba(148, 163, 184, .14)';
const emptyForm = { bio: '', favoriteGenres: '', preferredTheater: '', availableTimes: '', active: false };
const toForm = (profile) => ({
  bio: profile?.bio || '', favoriteGenres: (profile?.favoriteGenres || []).join(', '),
  preferredTheater: profile?.preferredTheater || '', availableTimes: profile?.availableTimes || '',
  active: Boolean(profile?.active),
});
const splitGenres = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const firstLetter = (name) => (name || 'T').trim()[0]?.toUpperCase();

const Photo = ({ person, height, radius = 0 }) => <Box sx={{ height, overflow: 'hidden', borderRadius: radius, bgcolor: SURFACE_DARK }}>
  {person?.avatarUrl ? <Box component="img" src={person.avatarUrl} alt={person.fullName || 'Hồ sơ hẹn hò'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
    : <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', background: 'linear-gradient(145deg, #172033, #26344b)' }}><Avatar sx={{ width: 130, height: 130, fontSize: 54, color: '#0B1020', background: 'linear-gradient(145deg, #FDE68A, #F59E0B)' }}>{firstLetter(person?.fullName)}</Avatar></Stack>}
</Box>;

const FloatingAction = ({ kind, disabled, onClick }) => {
  const like = kind === 'like';
  return <Tooltip title={like ? 'Thích hoặc vuốt phải' : 'Bỏ qua hoặc vuốt trái'}><span><IconButton
    aria-label={like ? 'Thích hồ sơ' : 'Bỏ qua hồ sơ'} disabled={disabled}
    onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClick(); }}
    sx={{ width: like ? 72 : 64, height: like ? 72 : 64, background: like ? 'linear-gradient(145deg, #FDE68A, #F59E0B)' : SURFACE_DARK, color: like ? '#0B1020' : TEXT,
      border: like ? 0 : `1px solid ${BORDER}`, boxShadow: like ? '0 12px 30px rgba(251,191,36,.24)' : '0 10px 26px rgba(0,0,0,.24)',
      '&:hover': { background: like ? `linear-gradient(145deg, ${ACCENT}, ${ACCENT_DARK})` : '#243147' } }}>
    {like ? <FavoriteRoundedIcon sx={{ fontSize: 38 }} /> : <CloseRoundedIcon sx={{ fontSize: 40 }} />}
  </IconButton></span></Tooltip>;
};

const DiscoveryCard = ({ person, nextPerson, busy, onDecision }) => {
  const [drag, setDrag] = useState({ active: false, startX: 0, x: 0 });
  const offset = drag.x;
  const rotation = Math.max(-8, Math.min(8, offset / 24));
  const finishDrag = () => {
    if (!drag.active) return;
    if (Math.abs(offset) >= 90 && !busy) onDecision(offset > 0 ? 'LIKE' : 'PASS');
    setDrag({ active: false, startX: 0, x: 0 });
  };

  return <Box sx={{ width: '100%', maxWidth: 640, height: { xs: 660, sm: 740 }, position: 'relative' }}>
    {nextPerson && <Paper sx={{ position: 'absolute', inset: '16px 14px -4px', borderRadius: 5, bgcolor: SURFACE_DARK, border: `1px solid ${BORDER}`, transform: 'scale(.97)' }} />}
    <Card onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ active: true, startX: event.clientX, x: 0 }); }}
      onPointerMove={(event) => drag.active && setDrag((value) => ({ ...value, x: event.clientX - value.startX }))}
      onPointerUp={finishDrag} onPointerCancel={finishDrag}
      sx={{ position: 'absolute', inset: 0, overflow: 'visible', borderRadius: 5, bgcolor: SURFACE, color: TEXT, cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'pan-y', userSelect: 'none',
        transform: `translateX(${offset}px) rotate(${rotation}deg)`, transition: drag.active ? 'none' : 'transform .22s ease', opacity: busy ? .65 : 1,
        border: `1px solid ${BORDER}`, boxShadow: '0 22px 56px rgba(0,0,0,.32)' }}>
      <Box sx={{ position: 'relative' }}>
        <Photo person={person} height={{ xs: 420, sm: 500 }} radius="20px 20px 0 0" />
        <Chip icon={<AutoAwesomeRoundedIcon />} label={`${person.compatibilityPercent || 0}% hợp gu`} sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(11,16,32,.88)', color: ACCENT, fontWeight: 900, border: '1px solid rgba(251,191,36,.32)', backdropFilter: 'blur(8px)' }} />
        {Math.abs(offset) > 25 && <Box sx={{ position: 'absolute', top: 74, [offset > 0 ? 'left' : 'right']: 24, px: 1.7, py: .45, border: '4px solid', borderColor: offset > 0 ? ACCENT : MUTED, color: offset > 0 ? ACCENT : MUTED, borderRadius: 2, fontWeight: 1000, fontSize: 22, transform: `rotate(${offset > 0 ? -9 : 9}deg)`, bgcolor: 'rgba(11,16,32,.84)' }}>{offset > 0 ? 'THÍCH' : 'BỎ QUA'}</Box>}
      </Box>
      <CardContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}><Typography variant="h4" fontWeight={950}>{person.fullName || 'Thành viên'}</Typography><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#35b86b' }} /></Stack>
        <Typography color={MUTED} sx={{ mt: .5, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{person.bio || 'Cùng mình tìm một bộ phim hay và một cuộc trò chuyện thú vị nhé.'}</Typography>
        <Stack direction="row" gap={.7} flexWrap="wrap" mt={1.5}>{(person.favoriteGenres || []).slice(0, 4).map((genre) => <Chip key={genre} size="small" label={genre} sx={{ bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 700 }} />)}</Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: .5, sm: 2 }} mt={1.5} color={MUTED}>
          {person.preferredTheater && <Typography variant="body2" display="flex" alignItems="center" gap={.5}><PlaceRoundedIcon sx={{ fontSize: 17 }} />{person.preferredTheater}</Typography>}
          {person.availableTimes && <Typography variant="body2" display="flex" alignItems="center" gap={.5}><LocalMoviesRoundedIcon sx={{ fontSize: 17 }} />{person.availableTimes}</Typography>}
        </Stack>
      </CardContent>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2.2} sx={{ position: 'absolute', right: 24, top: { xs: 384, sm: 461 } }}>
        <FloatingAction kind="pass" disabled={busy} onClick={() => onDecision('PASS')} />
        <FloatingAction kind="like" disabled={busy} onClick={() => onDecision('LIKE')} />
      </Stack>
      {busy && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />}
    </Card>
  </Box>;
};

const MatchTile = ({ match, onOpen }) => <Button onClick={onOpen} sx={{ minWidth: 118, p: 0, textTransform: 'none', color: TEXT, display: 'block', textAlign: 'left' }}>
  <Box sx={{ width: 118, height: 148, position: 'relative' }}><Photo person={match.person} height={148} radius={3} /><Typography fontWeight={900} color="white" noWrap sx={{ position: 'absolute', left: 10, right: 8, bottom: 8, textShadow: '0 1px 5px rgba(0,0,0,.75)' }}>{match.person?.fullName}</Typography></Box>
  <Chip size="small" label="Nhắn tin" icon={<ChatBubbleRoundedIcon />} sx={{ width: '100%', mt: .7, bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 800 }} />
</Button>;

const ConversationRow = ({ match, onOpen }) => <Button fullWidth onClick={onOpen} sx={{ justifyContent: 'flex-start', textAlign: 'left', color: TEXT, textTransform: 'none', px: 1.5, py: 1.2, borderRadius: 3, '&:hover': { bgcolor: 'rgba(251,191,36,.07)' } }}>
  <Avatar src={match.person?.avatarUrl} sx={{ width: 62, height: 62, mr: 1.6 }}>{firstLetter(match.person?.fullName)}</Avatar>
  <Box flex={1} minWidth={0}><Typography fontWeight={900} fontSize="1.05rem" noWrap>{match.person?.fullName}</Typography><Typography color={MUTED} noWrap>Bắt đầu cuộc trò chuyện về bộ phim yêu thích</Typography></Box>
  <Box sx={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${BORDER}`, display: 'grid', placeItems: 'center', color: ACCENT }}><ChatBubbleRoundedIcon sx={{ fontSize: 15 }} /></Box>
</Button>;

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

  const loadCandidates = useCallback(async () => {
    setLoading(true); setError('');
    try { setCandidates(await memberIntelligenceService.matchingCandidates() || []); }
    catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  const loadMatches = useCallback(async () => {
    setLoading(true); setError('');
    try { const items = await memberIntelligenceService.matches() || []; setMatches(items); return items; }
    catch (err) { showError(err); return []; } finally { setLoading(false); }
  }, []);
  const loadPassed = useCallback(async () => {
    setLoading(true); setError('');
    try { setPassed(await memberIntelligenceService.passedMatchingCandidates() || []); }
    catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  const loadProfile = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await memberIntelligenceService.matchingProfile();
      setProfile(result); setForm(toForm(result));
      if (result?.active) setCandidates(await memberIntelligenceService.matchingCandidates() || []);
    } catch (err) { showError(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  useEffect(() => connectRealtime({ onEvent: async (event) => {
    const isMatchEvent = event.type === 'MOVIE_MATCH' || (event.type === 'NOTIFICATION' && event.data?.notificationType === 'MOVIE_MATCH');
    if (!isMatchEvent) return;
    const items = await memberIntelligenceService.matches().catch(() => []);
    setMatches(items); setTab(1);
    const matched = items.find((item) => String(item.matchId) === String(event.data?.matchId));
    if (matched) setSelectedMatch(matched);
    setNotice('Bạn có một kết nối mới! Hãy bắt đầu trò chuyện.');
  } }), []);

  const save = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await memberIntelligenceService.saveMatchingProfile({ ...form, favoriteGenres: splitGenres(form.favoriteGenres) });
      setProfile(result); setForm(toForm(result)); setNotice('Đã lưu hồ sơ hẹn hò.');
      if (result?.active) setCandidates(await memberIntelligenceService.matchingCandidates() || []);
    } catch (err) { showError(err); } finally { setLoading(false); }
  };
  const uploadPhoto = async (event) => {
    const image = event.target.files?.[0]; event.target.value = '';
    if (!image) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size > 8 * 1024 * 1024) { setError('Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 8 MB.'); return; }
    setLoading(true); setError('');
    try { const result = await memberIntelligenceService.uploadMatchingPhoto(image); setProfile(result); setNotice('Đã cập nhật ảnh hẹn hò.'); }
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
      setNotice(result?.matched ? `Bạn và ${person.fullName} đã ghép đôi!` : decision === 'LIKE' ? 'Đã gửi lượt thích.' : `Đã bỏ qua ${person.fullName}.`);
      if (result?.matched) { const items = await loadMatches(); setTab(1); const matched = items.find((item) => String(item.matchId) === String(result.matchId)); if (matched) setSelectedMatch(matched); }
    } catch (err) { showError(err); } finally { setBusyId(null); }
  };
  const restore = async (person) => {
    setBusyId(person.userId); setError('');
    try { await memberIntelligenceService.restoreMatchingCandidate(person.userId); setPassed((items) => items.filter((item) => item.userId !== person.userId)); setCandidates((items) => [person, ...items.filter((item) => item.userId !== person.userId)]); setNotice(`${person.fullName} đã trở lại phần gợi ý.`); }
    catch (err) { showError(err); } finally { setBusyId(null); }
  };
  const changeTab = (_, value) => { setTab(value); setError(''); setNotice(''); if (value === 0 && profile?.active) loadCandidates(); if (value === 1) loadMatches(); if (value === 3) loadPassed(); };
  const handleMatchEnded = useCallback(async () => { await loadMatches(); if (profile?.active) await loadCandidates(); }, [loadMatches, loadCandidates, profile?.active]);
  const visibleCandidates = candidates;
  const activePerson = visibleCandidates[0];

  return <Box sx={{ color: TEXT }}>
    <Box sx={{ mb: 3, p: .75, borderRadius: 3.5, bgcolor: 'rgba(30,41,59,.78)', border: `1px solid ${BORDER}`, boxShadow: '0 12px 32px rgba(0,0,0,.18)', backdropFilter: 'blur(12px)', overflow: 'hidden' }}>
    <Tabs value={tab} onChange={changeTab} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 50,
      '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTabs-flexContainer': { gap: .75 },
      '& .MuiTab-root': { flex: { sm: 1 }, minWidth: { xs: 140, sm: 0 }, minHeight: 48, borderRadius: 2.5, color: MUTED, textTransform: 'none', fontWeight: 850, px: { xs: 1.5, md: 2.4 }, border: '1px solid transparent', transition: 'all .2s ease' },
      '& .MuiTab-root:hover': { color: TEXT, bgcolor: 'rgba(148,163,184,.07)' },
      '& .Mui-selected': { bgcolor: `${ACCENT_SOFT} !important`, color: `${ACCENT} !important`, borderColor: 'rgba(251,191,36,.28)', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.04)' } }}>
      <Tab label="Gợi ý ghép đôi" /><Tab label={`Ghép đôi${matches.length ? ` (${matches.length})` : ''}`} /><Tab label="Hồ sơ hẹn hò" /><Tab label={`Xem lại${passed.length ? ` (${passed.length})` : ''}`} />
    </Tabs>
    </Box>
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    {loading ? <Box textAlign="center" py={10}><CircularProgress sx={{ color: ACCENT }} /></Box> : <>
      {tab === 0 && (!profile?.active ? <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><FavoriteRoundedIcon sx={{ fontSize: 54, color: ACCENT }} /><Typography variant="h5" fontWeight={950}>Bật hồ sơ để bắt đầu</Typography><Typography color={MUTED} mt={1} mb={2}>Hoàn thiện hồ sơ hẹn hò trước khi khám phá người cùng gu phim.</Typography><Button variant="contained" onClick={() => setTab(2)}>Tạo hồ sơ</Button></Paper>
        : !activePerson ? <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><AutoAwesomeRoundedIcon sx={{ fontSize: 54, color: ACCENT }} /><Typography variant="h5" fontWeight={950}>Bạn đã xem hết gợi ý mới</Typography><Typography color={MUTED} mt={1} mb={2}>Quay lại sau hoặc xem lại những hồ sơ đã bỏ qua.</Typography><Button startIcon={<ReplayRoundedIcon />} onClick={() => { setTab(3); loadPassed(); }}>Xem lại hồ sơ</Button></Paper>
          : <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Stack alignItems="center" spacing={2} sx={{ width: '100%', maxWidth: 640 }}>
              <DiscoveryCard key={activePerson.userId} person={activePerson} nextPerson={visibleCandidates[1]} busy={busyId === activePerson.userId} onDecision={(decision) => act(activePerson, decision)} />
            </Stack>
          </Box>)}

      {tab === 1 && <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 18px 44px rgba(0,0,0,.22)' }}>
        <Typography variant="h5" fontWeight={950}>Các kết nối mới</Typography><Typography color={MUTED} mb={2.5}>Những người đã cùng thích bạn</Typography>
        {matches.length === 0 ? <Alert severity="info">Chưa có kết nối nào. Hãy khám phá thêm hồ sơ mới.</Alert> : <><Stack direction="row" spacing={1.8} sx={{ overflowX: 'auto', pb: 2 }}>{matches.map((match) => <MatchTile key={match.matchId} match={match} onOpen={() => setSelectedMatch(match)} />)}</Stack><Divider sx={{ my: 2 }} /><Typography variant="h5" fontWeight={950} mb={1}>Cuộc trò chuyện</Typography><Stack>{matches.map((match) => <ConversationRow key={match.matchId} match={match} onOpen={() => setSelectedMatch(match)} />)}</Stack></>}
      </Paper>}

      {tab === 2 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(270px,.8fr) 1.2fr' }, gap: 2.5 }}>
        <Card sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><Box sx={{ position: 'relative' }}><Photo person={profile || {}} height={430} /><Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 18, bottom: 18 }}><Button variant="contained" startIcon={<PhotoCameraRoundedIcon />} onClick={() => photoInput.current?.click()}>Chọn ảnh</Button>{profile?.customDatingPhoto && <IconButton onClick={removePhoto} sx={{ bgcolor: SURFACE, color: ACCENT, '&:hover': { bgcolor: SURFACE_DARK } }}><DeleteOutlineRoundedIcon /></IconButton>}</Stack><input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /></Box></Card>
        <Card sx={{ borderRadius: 4, bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}><Typography variant="h5" fontWeight={950}>Chỉnh sửa hồ sơ</Typography><Typography color={MUTED} mb={3}>Giúp người cùng gu hiểu thêm về bạn.</Typography><Stack spacing={2}><TextField label="Giới thiệu bản thân" multiline minRows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} inputProps={{ maxLength: 500 }} /><TextField label="Thể loại yêu thích" helperText="Ví dụ: Marvel, Anime, Tâm lý" value={form.favoriteGenres} onChange={(event) => setForm({ ...form, favoriteGenres: event.target.value })} /><TextField label="Rạp yêu thích" value={form.preferredTheater} onChange={(event) => setForm({ ...form, preferredTheater: event.target.value })} /><TextField label="Thời gian thường rảnh" value={form.availableTimes} onChange={(event) => setForm({ ...form, availableTimes: event.target.value })} /><Divider /><FormControlLabel control={<Switch checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />} label="Cho phép hiển thị hồ sơ trong gợi ý" /><Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save}>Lưu hồ sơ</Button></Stack></CardContent></Card>
      </Box>}

      {tab === 3 && (passed.length === 0 ? <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><ReplayRoundedIcon sx={{ fontSize: 52, color: ACCENT }} /><Typography variant="h6" fontWeight={900}>Chưa có hồ sơ cần xem lại</Typography></Paper> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>{passed.map((person) => <Card key={person.userId} sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: SURFACE, border: `1px solid ${BORDER}` }}><Photo person={person} height={260} /><CardContent><Typography variant="h6" fontWeight={950}>{person.fullName}</Typography><Typography color={MUTED} noWrap mb={1.5}>{person.bio || 'Hồ sơ cùng gu phim'}</Typography><Button fullWidth variant="outlined" startIcon={<ReplayRoundedIcon />} disabled={busyId === person.userId} onClick={() => restore(person)}>Đưa lại vào gợi ý</Button></CardContent></Card>)}</Box>)}
    </>}
    <MatchRoomDialog match={selectedMatch} open={Boolean(selectedMatch)} onClose={() => setSelectedMatch(null)} onMatchEnded={handleMatchEnded} />
  </Box>;
}
