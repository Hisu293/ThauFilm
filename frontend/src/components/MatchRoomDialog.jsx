import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { memberIntelligenceService } from '../services/intelligenceService';
import { connectMatchChat } from '../services/realtimeService';
import { invitationStatusLabel } from '../utils/statusLabels';

const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '';

export default function MatchRoomDialog({ match, open, onClose, onMatchEnded }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [content, setContent] = useState('');
  const [showtimeId, setShowtimeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [report, setReport] = useState({ reason: '', details: '' });
  const [chatStatus, setChatStatus] = useState('disconnected');
  const chatConnection = useRef(null);

  const loadRoom = useCallback(async () => {
    if (!match?.matchId) return;
    setLoading(true); setError('');
    try {
      const [messageData, invitationData, showtimeResponse] = await Promise.all([
        memberIntelligenceService.matchMessages(match.matchId),
        memberIntelligenceService.matchInvitations(match.matchId),
        bookingApi.fetchShowtimes(),
      ]);
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        (messageData || []).forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      setInvitations(invitationData || []);
      const raw = showtimeResponse?.data?.data ?? showtimeResponse?.data ?? [];
      setShowtimes(bookingService.normalizeShowtimes(raw).filter((item) => new Date(item.startTime).getTime() > Date.now() && !['CANCELLED', 'COMPLETED'].includes(item.status)));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [match?.matchId]);

  useEffect(() => {
    if (!open) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoom();
    const connection = connectMatchChat({
      matchId: match.matchId,
      onStatus: setChatStatus,
      onEvent: (event) => {
        if (event.type === 'MATCH_MESSAGE' && String(event.data?.matchId) === String(match?.matchId) && event.data?.message) {
          setMessages((items) => items.some((item) => item.id === event.data.message.id) ? items : [...items, event.data.message]);
        } else if (event.type === 'MATCH_MESSAGE' && String(event.data?.matchId) === String(match?.matchId)) {
          loadRoom();
        } else if (['MATCH_INVITATION', 'MATCH_INVITATION_UPDATED'].includes(event.type) && String(event.data?.matchId) === String(match?.matchId)) {
          if (event.data?.invitation) {
            setInvitations((items) => [event.data.invitation, ...items.filter((item) => item.id !== event.data.invitation.id)]);
          } else {
            loadRoom();
          }
        } else if (event.type === 'REALTIME_ERROR') {
          setError(event.data?.message || 'Không thể gửi tin nhắn');
        }
      },
    });
    chatConnection.current = connection;
    return () => { connection.disconnect(); chatConnection.current = null; };
  }, [open, loadRoom, match?.matchId]);

  const selected = useMemo(() => showtimes.find((item) => item.id === showtimeId), [showtimes, showtimeId]);
  const send = async () => {
    if (!content.trim()) return;
    if (!chatConnection.current?.sendMessage(match.matchId, content.trim())) {
      setError('Kết nối chat đang gián đoạn. Vui lòng đợi kết nối lại.');
      return;
    }
    setContent(''); setError('');
  };
  const invite = async () => {
    if (!showtimeId) return;
    try { const invitation = await memberIntelligenceService.sendMatchInvitation(match.matchId, showtimeId); setInvitations((items) => [invitation, ...items.filter((item) => item.id !== invitation.id)]); setShowtimeId(''); }
    catch (err) { setError(err.message); }
  };
  const respond = async (invitation, decision) => {
    try {
      const updated = await memberIntelligenceService.respondMatchInvitation(invitation.id, decision);
      setInvitations((items) => items.map((item) => item.id === updated.id ? updated : item));
      if (decision === 'ACCEPT' && updated.bookingPath) { onClose(); navigate(updated.bookingPath); }
    } catch (err) { setError(err.message); }
  };
  const endMatch = async (type) => {
    const label = type === 'block' ? 'chặn người này' : 'hủy match';
    if (!window.confirm(`Bạn chắc chắn muốn ${label}?`)) return;
    try { if (type === 'block') await memberIntelligenceService.blockMatch(match.matchId); else await memberIntelligenceService.cancelMatch(match.matchId); onClose(); onMatchEnded(); }
    catch (err) { setError(err.message); }
  };
  const submitReport = async () => {
    try { await memberIntelligenceService.reportMatch(match.matchId, report); setReporting(false); setReport({ reason: '', details: '' }); }
    catch (err) { setError(err.message); }
  };

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"><DialogTitle><Stack direction="row" alignItems="center" spacing={1.5}><Avatar src={match?.person?.avatarUrl}>{match?.person?.fullName?.[0]}</Avatar><Box flex={1}><Typography fontWeight={900}>Phòng chat với {match?.person?.fullName}</Typography><Typography variant="caption" color="text.secondary">Chỉ hai người trong match xem được nội dung này</Typography></Box><IconButton onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 3 }}><Tab label="Trò chuyện" /><Tab label={`Lời mời (${invitations.length})`} /><Tab label="An toàn" /></Tabs><Divider />
    <DialogContent sx={{ minHeight: 430 }}>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{loading ? <Box textAlign="center" py={8}><CircularProgress /></Box> : <>
      {tab === 0 && <Stack sx={{ height: 390 }}><Box flex={1} overflow="auto"><Stack spacing={1.2}>{chatStatus !== 'connected' && <Alert severity="warning">Đang kết nối lại phòng chat...</Alert>}{messages.length === 0 && <Alert severity="info">Hãy gửi lời chào đầu tiên.</Alert>}{messages.map((message) => { const mine = String(message.senderId) === String(user?.id); return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} maxWidth="75%" bgcolor={mine ? 'primary.main' : 'action.hover'} color={mine ? 'primary.contrastText' : 'text.primary'} px={1.5} py={1} borderRadius={2}><Typography variant="body2">{message.content}</Typography><Typography variant="caption" sx={{ opacity: 0.7 }}>{dateTime(message.createdAt)}</Typography></Box>; })}</Stack></Box><Stack direction="row" spacing={1} mt={2}><TextField fullWidth size="small" placeholder="Nhập tin nhắn..." value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} inputProps={{ maxLength: 1000 }} /><Button variant="contained" disabled={chatStatus !== 'connected'} onClick={send} startIcon={<SendRoundedIcon />}>Gửi</Button></Stack></Stack>}
      {tab === 1 && <Stack spacing={2}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}><TextField select fullWidth label="Chọn suất chiếu" value={showtimeId} onChange={(e) => setShowtimeId(e.target.value)}>{showtimes.map((item) => <MenuItem key={item.id} value={item.id}>{item.movieTitle} · {dateTime(item.startTime)} · {item.theaterName}</MenuItem>)}</TextField><Button variant="contained" disabled={!selected} onClick={invite}>Gửi lời mời</Button></Stack>{invitations.length === 0 && <Alert severity="info">Chưa có lời mời xem phim.</Alert>}{invitations.map((item) => { const recipient = String(item.recipientId) === String(user?.id); const statusLabel = invitationStatusLabel(item.expired ? 'EXPIRED' : item.status); const statusColor = item.expired || item.status === 'DECLINED' ? 'error' : item.status === 'ACCEPTED' ? 'success' : 'warning'; return <Box key={item.id} border={1} borderColor="divider" borderRadius={2} p={2}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography fontWeight={900}>{item.movieTitle}</Typography><Typography variant="body2">{item.startTime ? dateTime(item.startTime) : 'Suất chiếu không còn tồn tại'}{item.theaterName ? ` · ${item.theaterName}` : ''}{item.roomName ? ` · ${item.roomName}` : ''}</Typography><Chip size="small" sx={{ mt: 1 }} label={statusLabel} color={statusColor} /></Box><Stack direction="row" alignItems="center" spacing={1}>{recipient && item.status === 'PENDING' && !item.expired && <><Button color="error" onClick={() => respond(item, 'DECLINE')}>Từ chối</Button><Button variant="contained" onClick={() => respond(item, 'ACCEPT')}>Chấp nhận</Button></>}{item.canSelectSeats && item.bookingPath && <Button variant="contained" onClick={() => { onClose(); navigate(item.bookingPath); }}>Chọn ghế</Button>}</Stack></Stack></Box>; })}</Stack>}
      {tab === 2 && <Stack spacing={2}><Alert severity="warning">Chặn sẽ kết thúc match ngay lập tức. Báo cáo sẽ được lưu để quản trị viên xử lý.</Alert><Button variant="outlined" color="error" onClick={() => endMatch('cancel')}>Hủy match</Button><Button variant="outlined" color="error" startIcon={<BlockRoundedIcon />} onClick={() => endMatch('block')}>Chặn người này</Button><Button variant="outlined" startIcon={<FlagRoundedIcon />} onClick={() => setReporting(true)}>Báo cáo người dùng</Button>{reporting && <Box border={1} borderColor="divider" borderRadius={2} p={2}><Stack spacing={2}><TextField label="Lý do" required value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })} inputProps={{ maxLength: 100 }} /><TextField label="Chi tiết" multiline minRows={3} value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} inputProps={{ maxLength: 1000 }} /><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setReporting(false)}>Hủy</Button><Button variant="contained" color="error" disabled={!report.reason.trim()} onClick={submitReport}>Gửi báo cáo</Button></Stack></Stack></Box>}</Stack>}
    </>}</DialogContent><DialogActions><Button onClick={onClose}>Đóng</Button></DialogActions></Dialog>;
}
