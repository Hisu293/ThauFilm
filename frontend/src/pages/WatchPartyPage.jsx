import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Container, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import InsertEmoticonRoundedIcon from '@mui/icons-material/InsertEmoticonRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentVerySatisfiedRoundedIcon from '@mui/icons-material/SentimentVerySatisfiedRounded';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getMovieStreamUrl } from '../data/movieStreams';
import { connectWatchParty } from '../services/realtimeService';
import watchPartyService from '../services/watchPartyService';

const HLS_MIME_TYPE = 'application/vnd.apple.mpegurl';
const REACTIONS = {
  heart: '\u2764\uFE0F',
  laugh: '\uD83D\uDE02',
  wow: '\uD83D\uDE2E',
};
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

export default function WatchPartyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const realtime = useRef(null);
  const applyingRemote = useRef(false);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [reactions, setReactions] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const streamUrl = useMemo(() => (room ? getMovieStreamUrl({ id: room.movieId }) : ''), [room]);
  const inviteUrl = room ? `${window.location.origin}${room.invitePath || `/watch-party/${room.id}`}` : '';
  const me = room?.members?.find((member) => member.currentUser);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await watchPartyService.get(roomId);
      setRoom(next);
      setMessages(next.messages || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải phòng xem nhóm.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!roomId || !location.search) return;
    const params = new URLSearchParams(location.search);
    const returnedFromPayos = params.has('orderCode') || params.has('status') || params.has('code') || params.has('id');
    const cancelled = String(params.get('cancel') || '').toLowerCase() === 'true';
    if (!returnedFromPayos || cancelled) return;

    watchPartyService.syncPayment(roomId)
      .then((next) => {
        setRoom(next);
        setMessages(next.messages || []);
        navigate(`/watch-party/${roomId}`, { replace: true });
      })
      .catch(() => {});
  }, [location.search, navigate, roomId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return undefined;

    let hls;
    let cancelled = false;
    const init = async () => {
      if (video.canPlayType(HLS_MIME_TYPE)) {
        video.src = streamUrl;
        return;
      }
      const { default: Hls } = await import('hls.js');
      if (cancelled || !Hls.isSupported()) return;
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    };
    init().catch(() => setError('Không thể phát video phòng xem nhóm.'));
    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [streamUrl]);

  const applyPlayback = useCallback((playback) => {
    const video = videoRef.current;
    if (!video || !playback) return;
    applyingRemote.current = true;
    const drift = Math.abs(video.currentTime - Number(playback.currentTime || 0));
    if (drift > 1.2) video.currentTime = Number(playback.currentTime || 0);
    const action = playback.paused ? video.pause() : video.play();
    Promise.resolve(action).catch(() => {});
    window.setTimeout(() => { applyingRemote.current = false; }, 400);
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;
    const connection = connectWatchParty({
      roomId,
      onStatus: setStatus,
      onEvent: (event) => {
        if (event.type === 'WATCH_PARTY_SUBSCRIBED') {
          setRoom(event.data);
          setMessages(event.data?.messages || []);
        } else if (event.type === 'WATCH_PARTY_UPDATED') {
          watchPartyService.get(roomId).then((next) => {
            setRoom(next);
            setMessages(next.messages || []);
          }).catch(() => {});
        } else if (event.type === 'WATCH_PARTY_CHAT') {
          setMessages((current) => [...current, event.data].slice(-80));
        } else if (event.type === 'WATCH_PARTY_REACTION') {
          setReactions((current) => [...current, event.data].slice(-8));
          window.setTimeout(() => {
            setReactions((current) => current.filter((item) => item.id !== event.data?.id));
          }, 2800);
        } else if (event.type === 'WATCH_PARTY_PLAYBACK') {
          applyPlayback(event.data);
        } else if (event.type === 'REALTIME_ERROR') {
          setError(event.data?.message || 'Kết nối phòng xem nhóm bị lỗi.');
        }
      },
    });
    realtime.current = connection;
    return () => { connection.disconnect(); realtime.current = null; };
  }, [applyPlayback, roomId]);

  const pay = async () => {
    setBusy(true);
    try {
      const next = await watchPartyService.pay(roomId);
      setRoom(next);
      if (next?.checkoutUrl) {
        window.location.href = next.checkoutUrl;
      }
    } catch (err) {
      setError(err.message || 'Không thể thanh toán vé xem nhóm.');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard?.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setError('Không thể copy link mời. Bạn có thể copy trực tiếp trong ô link.');
    }
  };

  const syncPayment = async () => {
    setBusy(true);
    try {
      const next = await watchPartyService.syncPayment(roomId);
      setRoom(next);
      setMessages(next.messages || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái thanh toán.');
    } finally {
      setBusy(false);
    }
  };

  const syncPlayback = () => {
    if (applyingRemote.current || !room?.readyToWatch) return;
    const video = videoRef.current;
    realtime.current?.syncPlayback({ currentTime: video?.currentTime || 0, paused: video?.paused ?? true });
  };

  const sendMessage = () => {
    const content = messageText.trim();
    if (!content) return;
    if (realtime.current?.sendMessage(content)) setMessageText('');
  };

  const sendReaction = (reaction) => {
    realtime.current?.sendReaction(reaction);
  };

  if (loading) return <Box py={12} textAlign="center"><CircularProgress /></Box>;
  if (!room) return <Container sx={{ py: 6 }}><Alert severity="error">{error || 'Không tìm thấy phòng xem nhóm.'}</Alert></Container>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper square sx={{ position: 'sticky', top: 0, zIndex: 20, px: { xs: 2, md: 4 }, py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            <IconButton onClick={() => navigate(`/movies/${room.movieId}`)}><ArrowBackRoundedIcon /></IconButton>
            <Box minWidth={0}>
              <Typography fontWeight={900} noWrap>Watch Party · {room.movieTitle}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color={status === 'connected' ? 'success' : 'warning'} label={status === 'connected' ? 'Realtime' : 'Đang kết nối'} />
                <Chip size="small" color={room.readyToWatch ? 'success' : 'warning'} label={room.readyToWatch ? 'Đã sẵn sàng xem' : 'Chờ thanh toán nhóm'} />
                <Typography variant="caption" color="text.secondary">{money(room.pricePerMember)} / người</Typography>
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={copyInvite}>
              {inviteCopied ? 'Đã copy' : 'Copy link mời'}
            </Button>
            {!me?.paid && <Button variant="outlined" disabled={busy} onClick={syncPayment}>Cập nhật thanh toán</Button>}
            {!me?.paid && <Button variant="contained" disabled={busy} onClick={pay}>Thanh toán phần tôi</Button>}
            {room.readyToWatch && <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={() => videoRef.current?.play()}>Xem</Button>}
          </Stack>
        </Stack>
        <TextField
          fullWidth
          size="small"
          value={inviteUrl}
          label="Link mời bạn bè"
          inputProps={{ readOnly: true }}
          onFocus={(event) => event.target.select()}
          sx={{ mt: 1.5 }}
        />
      </Paper>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Box flex={1} minWidth={0}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!room.readyToWatch && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Mời bạn bè bằng link, mỗi người thanh toán {money(room.pricePerMember)}. Khi tất cả đã thanh toán, cả phòng có thể bấm xem và video sẽ đồng bộ.
              </Alert>
            )}
            <Box sx={{ position: 'relative', bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
              <Box
                component="video"
                ref={videoRef}
                controls={room.readyToWatch}
                playsInline
                poster={room.posterUrl || undefined}
                onPlay={syncPlayback}
                onPause={syncPlayback}
                onSeeked={syncPlayback}
                sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', opacity: room.readyToWatch ? 1 : 0.42 }}
              />
              {!room.readyToWatch && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={900}>Chờ cả nhóm thanh toán</Typography>
                    <Typography color="text.secondary" mt={1}>Video sẽ mở khi mọi thành viên trong phòng đã trả phần của mình.</Typography>
                  </Box>
                </Box>
              )}
              <Box sx={{ pointerEvents: 'none', position: 'absolute', right: 18, bottom: 18 }}>
                <Stack spacing={1}>
                  {reactions.map((item) => (
                    <Typography key={item.id} variant="h4" sx={{ textShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>{item.reaction}</Typography>
                  ))}
                </Stack>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} mt={2}>
              <Button variant="outlined" startIcon={<FavoriteRoundedIcon />} onClick={() => sendReaction(REACTIONS.heart)}>{REACTIONS.heart}</Button>
              <Button variant="outlined" startIcon={<InsertEmoticonRoundedIcon />} onClick={() => sendReaction(REACTIONS.laugh)}>{REACTIONS.laugh}</Button>
              <Button variant="outlined" startIcon={<SentimentVerySatisfiedRoundedIcon />} onClick={() => sendReaction(REACTIONS.wow)}>{REACTIONS.wow}</Button>
            </Stack>
          </Box>

          <Stack sx={{ width: { lg: 360 } }} spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={900} mb={1}>Thành viên</Typography>
              <Stack spacing={1}>
                {(room.members || []).map((member) => (
                  <Stack key={member.userId} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box minWidth={0}>
                      <Typography fontWeight={800} noWrap>{member.fullName}{member.currentUser ? ' (Bạn)' : ''}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{member.email}</Typography>
                    </Box>
                    <Chip size="small" color={member.paid ? 'success' : 'warning'} label={member.paid ? 'Đã trả' : 'Chưa trả'} />
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2, height: 440, display: 'flex', flexDirection: 'column' }}>
              <Typography fontWeight={900} mb={1}>Chat phòng</Typography>
              <Box flex={1} overflow="auto" pr={0.5}>
                <Stack spacing={1}>
                  {messages.map((message) => (
                    <Box key={message.id} sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1 }}>
                      <Typography variant="caption" color="text.secondary">{message.senderName}</Typography>
                      <Typography variant="body2">{message.content}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} mt={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nhắn trong phòng..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <IconButton color="primary" onClick={sendMessage}><SendRoundedIcon /></IconButton>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
