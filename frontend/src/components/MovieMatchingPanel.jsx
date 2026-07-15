import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider,
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
import TheaterComedyRoundedIcon from '@mui/icons-material/TheaterComedyRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import { memberIntelligenceService } from '../services/intelligenceService';
import MatchRoomDialog from './MatchRoomDialog';
import { connectRealtime } from '../services/realtimeService';

const ACCENT = '#e83e6f';
const ACCENT_DARK = '#c52658';
const ACCENT_SOFT = '#fff0f4';
const SURFACE = '#fffafb';
const emptyForm = { bio: '', favoriteGenres: '', preferredTheater: '', availableTimes: '', active: false };
const toForm = (profile) => ({
  bio: profile?.bio || '', favoriteGenres: (profile?.favoriteGenres || []).join(', '),
  preferredTheater: profile?.preferredTheater || '', availableTimes: profile?.availableTimes || '',
  active: Boolean(profile?.active),
});
const splitGenres = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const firstLetter = (name) => (name || 'T').trim()[0]?.toUpperCase();

const Photo = ({ person, height, radius = 0 }) => <Box sx={{ height, overflow: 'hidden', borderRadius: radius, bgcolor: '#f1e6e9' }}>
  {person?.avatarUrl ? <Box component="img" src={person.avatarUrl} alt={person.fullName || 'Hồ sơ hẹn hò'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
    : <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', background: 'linear-gradient(145deg, #f7dfe6, #f8eadb)' }}><Avatar sx={{ width: 130, height: 130, fontSize: 54, background: 'linear-gradient(145deg, #f15b82, #cc2f5d)' }}>{firstLetter(person?.fullName)}</Avatar></Stack>}
</Box>;

const FloatingAction = ({ kind, disabled, onClick }) => {
  const like = kind === 'like';
  return <Tooltip title={like ? 'Thích hoặc vuốt phải' : 'Bỏ qua hoặc vuốt trái'}><span><IconButton
    aria-label={like ? 'Thích hồ sơ' : 'Bỏ qua hồ sơ'} disabled={disabled}
    onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClick(); }}
    sx={{ width: like ? 78 : 70, height: like ? 78 : 70, background: like ? 'linear-gradient(145deg, #f15b82, #d92f62)' : SURFACE, color: like ? '#fff' : '#604852',
      border: like ? 0 : '1px solid #efdee4', boxShadow: like ? '0 12px 30px rgba(232,62,111,.32)' : '0 10px 26px rgba(77,47,58,.16)',
      '&:hover': { background: like ? `linear-gradient(145deg, ${ACCENT}, ${ACCENT_DARK})` : '#fff4f7' } }}>
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

  return <Box sx={{ width: '100%', maxWidth: 570, height: { xs: 660, sm: 730 }, position: 'relative' }}>
    {nextPerson && <Paper sx={{ position: 'absolute', inset: '16px 14px -4px', borderRadius: 5, bgcolor: '#f0e3e7', transform: 'scale(.97)' }} />}
    <Card onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ active: true, startX: event.clientX, x: 0 }); }}
      onPointerMove={(event) => drag.active && setDrag((value) => ({ ...value, x: event.clientX - value.startX }))}
      onPointerUp={finishDrag} onPointerCancel={finishDrag}
      sx={{ position: 'absolute', inset: 0, overflow: 'visible', borderRadius: 5, bgcolor: SURFACE, color: '#25191e', cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'pan-y', userSelect: 'none',
        transform: `translateX(${offset}px) rotate(${rotation}deg)`, transition: drag.active ? 'none' : 'transform .22s ease', opacity: busy ? .65 : 1,
        border: '1px solid #efdee4', boxShadow: '0 18px 48px rgba(82,39,55,.14)' }}>
      <Box sx={{ position: 'relative' }}>
        <Photo person={person} height={{ xs: 430, sm: 505 }} radius="20px 20px 0 0" />
        <Chip icon={<AutoAwesomeRoundedIcon />} label={`${person.compatibilityPercent || 0}% hợp gu`} sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(255,250,251,.95)', color: ACCENT_DARK, fontWeight: 900, border: '1px solid rgba(232,62,111,.16)' }} />
        {Math.abs(offset) > 25 && <Box sx={{ position: 'absolute', top: 74, [offset > 0 ? 'left' : 'right']: 24, px: 1.7, py: .45, border: '4px solid', borderColor: offset > 0 ? ACCENT : '#6f5a63', color: offset > 0 ? ACCENT : '#6f5a63', borderRadius: 2, fontWeight: 1000, fontSize: 22, transform: `rotate(${offset > 0 ? -9 : 9}deg)`, bgcolor: 'rgba(255,250,251,.84)' }}>{offset > 0 ? 'THÍCH' : 'BỎ QUA'}</Box>}
      </Box>
      <CardContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}><Typography variant="h4" fontWeight={950}>{person.fullName || 'Thành viên'}</Typography><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#35b86b' }} /></Stack>
        <Typography color="#62606a" sx={{ mt: .5, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{person.bio || 'Cùng mình tìm một bộ phim hay và một cuộc trò chuyện thú vị nhé.'}</Typography>
        <Stack direction="row" gap={.7} flexWrap="wrap" mt={1.5}>{(person.favoriteGenres || []).slice(0, 4).map((genre) => <Chip key={genre} size="small" label={genre} sx={{ bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 700 }} />)}</Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: .5, sm: 2 }} mt={1.5} color="#716e78">
          {person.preferredTheater && <Typography variant="body2" display="flex" alignItems="center" gap={.5}><PlaceRoundedIcon sx={{ fontSize: 17 }} />{person.preferredTheater}</Typography>}
          {person.availableTimes && <Typography variant="body2" display="flex" alignItems="center" gap={.5}><LocalMoviesRoundedIcon sx={{ fontSize: 17 }} />{person.availableTimes}</Typography>}
        </Stack>
      </CardContent>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2.4} sx={{ position: 'absolute', right: 24, top: { xs: 393, sm: 466 } }}>
        <FloatingAction kind="pass" disabled={busy} onClick={() => onDecision('PASS')} />
        <FloatingAction kind="like" disabled={busy} onClick={() => onDecision('LIKE')} />
      </Stack>
      {busy && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />}
    </Card>
  </Box>;
};

const Shortcut = ({ icon, label, onClick, active = false }) => <Button onClick={onClick} sx={{ minWidth: 0, color: active ? ACCENT_DARK : '#25222b', textTransform: 'none', flexDirection: 'column', gap: .8, fontWeight: 800 }}>
  <Box sx={{ width: 58, height: 58, display: 'grid', placeItems: 'center', borderRadius: '50%', background: active ? 'linear-gradient(145deg, #f15b82, #d92f62)' : 'linear-gradient(145deg, #fff5f7, #f9dfe7)', color: active ? '#fff' : ACCENT_DARK, border: active ? '1px solid transparent' : '1px solid #f2d5de', boxShadow: active ? '0 8px 20px rgba(232,62,111,.28)' : 'none', transition: 'all .2s ease' }}>{icon}</Box><Typography variant="caption" fontWeight={850}>{label}</Typography>
</Button>;

const MatchTile = ({ match, onOpen }) => <Button onClick={onOpen} sx={{ minWidth: 118, p: 0, textTransform: 'none', color: '#17151b', display: 'block', textAlign: 'left' }}>
  <Box sx={{ width: 118, height: 148, position: 'relative' }}><Photo person={match.person} height={148} radius={3} /><Typography fontWeight={900} color="white" noWrap sx={{ position: 'absolute', left: 10, right: 8, bottom: 8, textShadow: '0 1px 5px rgba(0,0,0,.75)' }}>{match.person?.fullName}</Typography></Box>
  <Chip size="small" label="Nhắn tin" icon={<ChatBubbleRoundedIcon />} sx={{ width: '100%', mt: .7, bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 800 }} />
</Button>;

const ConversationRow = ({ match, onOpen }) => <Button fullWidth onClick={onOpen} sx={{ justifyContent: 'flex-start', textAlign: 'left', color: '#17151b', textTransform: 'none', px: 1, py: 1.1, borderRadius: 3 }}>
  <Avatar src={match.person?.avatarUrl} sx={{ width: 62, height: 62, mr: 1.6 }}>{firstLetter(match.person?.fullName)}</Avatar>
  <Box flex={1} minWidth={0}><Typography fontWeight={900} fontSize="1.05rem" noWrap>{match.person?.fullName}</Typography><Typography color="#77737e" noWrap>Bắt đầu cuộc trò chuyện về bộ phim yêu thích</Typography></Box>
  <Box sx={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #aaa6b0', display: 'grid', placeItems: 'center', color: '#77737e' }}><ChatBubbleRoundedIcon sx={{ fontSize: 15 }} /></Box>
</Button>;

export default function MovieMatchingPanel() {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [candidates, setCandidates] = useState([]);
  const [passed, setPassed] = useState([]);
  const [matches, setMatches] = useState([]);
  const [spotlightOnly, setSpotlightOnly] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const [genreDialogOpen, setGenreDialogOpen] = useState(false);
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
  const availableGenres = useMemo(() => Array.from(new Set(
    candidates.flatMap((person) => person.favoriteGenres || []).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, 'vi')), [candidates]);
  const visibleCandidates = useMemo(() => {
    let items = genreFilter
      ? candidates.filter((person) => (person.favoriteGenres || []).some((genre) => genre.toLocaleLowerCase('vi') === genreFilter.toLocaleLowerCase('vi')))
      : candidates;
    if (spotlightOnly) {
      items = [...items]
        .sort((left, right) => (right.compatibilityPercent || 0) - (left.compatibilityPercent || 0))
        .slice(0, 5);
    }
    return items;
  }, [candidates, genreFilter, spotlightOnly]);
  const clearDiscoveryFilters = () => { setSpotlightOnly(false); setGenreFilter(''); };
  const activePerson = visibleCandidates[0];
  const discoveryFiltered = spotlightOnly || Boolean(genreFilter);

  return <Box sx={{ color: '#17151b' }}>
    <Tabs value={tab} onChange={changeTab} variant="scrollable" scrollButtons={false} sx={{ mb: 3, minHeight: 52,
      '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTabs-flexContainer': { gap: 1 },
      '& .MuiTab-root': { minHeight: 48, borderRadius: 999, bgcolor: '#f0e7ea', color: '#4e3a42', textTransform: 'none', fontWeight: 900, px: 2.4, border: '1px solid transparent' },
      '& .Mui-selected': { bgcolor: ACCENT_SOFT, color: `${ACCENT_DARK} !important`, borderColor: '#f1cad6' } }}>
      <Tab label="Gợi ý ghép đôi" /><Tab label={`Ghép đôi${matches.length ? ` (${matches.length})` : ''}`} /><Tab label="Hồ sơ hẹn hò" /><Tab label={`Xem lại${passed.length ? ` (${passed.length})` : ''}`} />
    </Tabs>
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    {loading ? <Box textAlign="center" py={10}><CircularProgress sx={{ color: ACCENT }} /></Box> : <>
      {tab === 0 && (!profile?.active ? <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: '1px solid #efdee4' }}><FavoriteRoundedIcon sx={{ fontSize: 54, color: ACCENT }} /><Typography variant="h5" fontWeight={950}>Bật hồ sơ để bắt đầu</Typography><Typography color="#716e78" mt={1} mb={2}>Hoàn thiện hồ sơ hẹn hò trước khi khám phá người cùng gu phim.</Typography><Button variant="contained" onClick={() => setTab(2)} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT_DARK } }}>Tạo hồ sơ</Button></Paper>
        : !activePerson ? <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: '1px solid #efdee4' }}><AutoAwesomeRoundedIcon sx={{ fontSize: 54, color: ACCENT }} /><Typography variant="h5" fontWeight={950}>{discoveryFiltered ? 'Chưa có hồ sơ phù hợp bộ lọc' : 'Bạn đã xem hết gợi ý mới'}</Typography><Typography color="#716e78" mt={1} mb={2}>{discoveryFiltered ? 'Hãy thử bỏ bộ lọc Nổi bật hoặc chọn một gu phim khác.' : 'Quay lại sau hoặc xem lại những hồ sơ đã bỏ qua.'}</Typography>{discoveryFiltered ? <Button onClick={clearDiscoveryFilters} sx={{ color: ACCENT_DARK }}>Xóa bộ lọc</Button> : <Button startIcon={<ReplayRoundedIcon />} onClick={() => { setTab(3); loadPassed(); }} sx={{ color: ACCENT_DARK }}>Xem lại hồ sơ</Button>}</Paper>
          : <Stack alignItems="center" spacing={2.5}>
            {discoveryFiltered && <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">{spotlightOnly && <Chip label="Top hồ sơ hợp gu" onDelete={() => setSpotlightOnly(false)} sx={{ bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 800 }} />}{genreFilter && <Chip label={`Gu phim: ${genreFilter}`} onDelete={() => setGenreFilter('')} sx={{ bgcolor: ACCENT_SOFT, color: ACCENT_DARK, fontWeight: 800 }} />}</Stack>}
            <DiscoveryCard key={activePerson.userId} person={activePerson} nextPerson={visibleCandidates[1]} busy={busyId === activePerson.userId} onDecision={(decision) => act(activePerson, decision)} />
            <Stack direction="row" justifyContent="space-around" sx={{ width: '100%', maxWidth: 570, pt: 1 }}><Shortcut icon={<AutoAwesomeRoundedIcon />} label="Nổi bật" active={spotlightOnly} onClick={() => setSpotlightOnly((current) => !current)} /><Shortcut icon={<TheaterComedyRoundedIcon />} label={genreFilter ? `Gu: ${genreFilter}` : 'Gu phim'} active={Boolean(genreFilter)} onClick={() => setGenreDialogOpen(true)} /><Shortcut icon={<PeopleAltRoundedIcon />} label="Ghép đôi" onClick={() => { setTab(1); loadMatches(); }} /><Shortcut icon={<ReplayRoundedIcon />} label="Xem lại" onClick={() => { setTab(3); loadPassed(); }} /></Stack>
            <Typography variant="caption" color="#85818c">Vuốt trái để bỏ qua · Vuốt phải để thích</Typography>
          </Stack>)}

      {tab === 1 && <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: SURFACE, border: '1px solid #efdee4', boxShadow: '0 12px 36px rgba(82,39,55,.08)' }}>
        <Typography variant="h5" fontWeight={950}>Các kết nối mới</Typography><Typography color="#77737e" mb={2.5}>Những người đã cùng thích bạn</Typography>
        {matches.length === 0 ? <Alert severity="info">Chưa có kết nối nào. Hãy khám phá thêm hồ sơ mới.</Alert> : <><Stack direction="row" spacing={1.8} sx={{ overflowX: 'auto', pb: 2 }}>{matches.map((match) => <MatchTile key={match.matchId} match={match} onOpen={() => setSelectedMatch(match)} />)}</Stack><Divider sx={{ my: 2 }} /><Typography variant="h5" fontWeight={950} mb={1}>Cuộc trò chuyện</Typography><Stack>{matches.map((match) => <ConversationRow key={match.matchId} match={match} onOpen={() => setSelectedMatch(match)} />)}</Stack></>}
      </Paper>}

      {tab === 2 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(270px,.8fr) 1.2fr' }, gap: 2.5 }}>
        <Card sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: SURFACE, border: '1px solid #efdee4' }}><Box sx={{ position: 'relative' }}><Photo person={profile || {}} height={430} /><Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 18, bottom: 18 }}><Button variant="contained" startIcon={<PhotoCameraRoundedIcon />} onClick={() => photoInput.current?.click()} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT_DARK } }}>Chọn ảnh</Button>{profile?.customDatingPhoto && <IconButton onClick={removePhoto} sx={{ bgcolor: SURFACE, color: ACCENT_DARK, '&:hover': { bgcolor: '#fff0f4' } }}><DeleteOutlineRoundedIcon /></IconButton>}</Stack><input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /></Box></Card>
        <Card sx={{ borderRadius: 4, bgcolor: SURFACE, border: '1px solid #efdee4' }}><CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}><Typography variant="h5" fontWeight={950}>Chỉnh sửa hồ sơ</Typography><Typography color="#77737e" mb={3}>Giúp người cùng gu hiểu thêm về bạn.</Typography><Stack spacing={2}><TextField label="Giới thiệu bản thân" multiline minRows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} inputProps={{ maxLength: 500 }} /><TextField label="Thể loại yêu thích" helperText="Ví dụ: Marvel, Anime, Tâm lý" value={form.favoriteGenres} onChange={(event) => setForm({ ...form, favoriteGenres: event.target.value })} /><TextField label="Rạp yêu thích" value={form.preferredTheater} onChange={(event) => setForm({ ...form, preferredTheater: event.target.value })} /><TextField label="Thời gian thường rảnh" value={form.availableTimes} onChange={(event) => setForm({ ...form, availableTimes: event.target.value })} /><Divider /><FormControlLabel control={<Switch checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }} />} label="Cho phép hiển thị hồ sơ trong gợi ý" /><Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT_DARK } }}>Lưu hồ sơ</Button></Stack></CardContent></Card>
      </Box>}

      {tab === 3 && (passed.length === 0 ? <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: SURFACE, border: '1px solid #efdee4' }}><ReplayRoundedIcon sx={{ fontSize: 52, color: ACCENT }} /><Typography variant="h6" fontWeight={900}>Chưa có hồ sơ cần xem lại</Typography></Paper> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>{passed.map((person) => <Card key={person.userId} sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: SURFACE, border: '1px solid #efdee4' }}><Photo person={person} height={260} /><CardContent><Typography variant="h6" fontWeight={950}>{person.fullName}</Typography><Typography color="#77737e" noWrap mb={1.5}>{person.bio || 'Hồ sơ cùng gu phim'}</Typography><Button fullWidth variant="outlined" startIcon={<ReplayRoundedIcon />} disabled={busyId === person.userId} onClick={() => restore(person)} sx={{ color: ACCENT_DARK, borderColor: '#edc4d0', '&:hover': { borderColor: ACCENT, bgcolor: ACCENT_SOFT } }}>Đưa lại vào gợi ý</Button></CardContent></Card>)}</Box>)}
    </>}
    <Dialog open={genreDialogOpen} onClose={() => setGenreDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, bgcolor: SURFACE } }}>
      <DialogTitle fontWeight={950}>Chọn gu phim muốn khám phá</DialogTitle>
      <DialogContent><Typography color="#716e78" mb={2}>Chỉ hiển thị những người có thể loại phim này trong sở thích.</Typography>{availableGenres.length === 0 ? <Alert severity="info">Chưa có thể loại phim nào trong các hồ sơ hiện tại.</Alert> : <Stack direction="row" gap={1} flexWrap="wrap">{availableGenres.map((genre) => <Chip key={genre} clickable label={genre} onClick={() => { setGenreFilter(genre); setGenreDialogOpen(false); }} sx={{ bgcolor: genreFilter === genre ? ACCENT : '#f4eaed', color: genreFilter === genre ? '#fff' : '#4e3a42', fontWeight: 800, '&:hover': { bgcolor: genreFilter === genre ? ACCENT_DARK : '#f0dce2' } }} />)}</Stack>}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => { setGenreFilter(''); setGenreDialogOpen(false); }} sx={{ color: ACCENT_DARK }}>Bỏ lọc gu phim</Button><Button onClick={() => setGenreDialogOpen(false)}>Đóng</Button></DialogActions>
    </Dialog>
    <MatchRoomDialog match={selectedMatch} open={Boolean(selectedMatch)} onClose={() => setSelectedMatch(null)} onMatchEnded={handleMatchEnded} />
  </Box>;
}
