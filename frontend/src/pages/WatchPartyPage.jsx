import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Container, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import InsertEmoticonRoundedIcon from '@mui/icons-material/InsertEmoticonRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentVerySatisfiedRoundedIcon from '@mui/icons-material/SentimentVerySatisfiedRounded';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { connectWatchParty } from '../services/realtimeService';
import watchPartyService from '../services/watchPartyService';

const HLS_MIME_TYPE = 'application/vnd.apple.mpegurl';
const isHlsSource = (src) => String(src || '').split('?')[0].toLowerCase().endsWith('.m3u8');
const REACTIONS = {
  heart: '\u2764\uFE0F',
  laugh: '\uD83D\uDE02',
  wow: '\uD83D\uDE2E',
};

const REACTION_OPTIONS = [
  { key: 'heart', label: 'Love', icon: <FavoriteRoundedIcon fontSize="small" />, value: REACTIONS.heart },
  { key: 'laugh', label: 'Funny', icon: <InsertEmoticonRoundedIcon fontSize="small" />, value: REACTIONS.laugh },
  { key: 'wow', label: 'Wow', icon: <SentimentVerySatisfiedRoundedIcon fontSize="small" />, value: REACTIONS.wow },
];

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const getPublicAppUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  return (configuredUrl || window.location.origin).replace(/\/+$/, '');
};

export default function WatchPartyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const realtime = useRef(null);
  const applyingRemote = useRef(false);
  const playbackReady = useRef(false);
  const latestPlayback = useRef(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [reactions, setReactions] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');

  const inviteUrl = room ? `${getPublicAppUrl()}${room.invitePath || `/watch-party/${room.id}`}` : '';
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
    latestPlayback.current = room?.playback || null;
  }, [room?.playback]);

  const applyPlayback = useCallback((playback) => {
    const video = videoRef.current;
    if (!video || !playback) return;
    applyingRemote.current = true;
    const targetTime = Number(playback.currentTime || 0);
    const drift = Math.abs(video.currentTime - targetTime);
    if (drift > 1.2) video.currentTime = targetTime;
    const action = playback.paused ? video.pause() : video.play();
    Promise.resolve(action).catch(() => {});
    window.setTimeout(() => { applyingRemote.current = false; }, 400);
  }, []);

  useEffect(() => {
    if (!room?.readyToWatch || !me?.paid) {
      setStreamUrl('');
      playbackReady.current = false;
      return;
    }
    let cancelled = false;
    watchPartyService.stream(roomId)
      .then((stream) => {
        if (!cancelled) {
          setStreamUrl(stream?.streamUrl || '');
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Khong the lay link xem phim nhom.');
      });
    return () => { cancelled = true; };
  }, [me?.paid, room?.readyToWatch, roomId]);

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
    playbackReady.current = false;
    const applyInitialPlayback = () => {
      if (cancelled) return;
      applyPlayback(latestPlayback.current);
      playbackReady.current = true;
    };
    video.addEventListener('loadedmetadata', applyInitialPlayback, { once: true });
    const init = async () => {
      if (!isHlsSource(streamUrl) || video.canPlayType(HLS_MIME_TYPE)) {
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
      video.removeEventListener('loadedmetadata', applyInitialPlayback);
      playbackReady.current = false;
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [applyPlayback, streamUrl]);

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
    if (!playbackReady.current) return;
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
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#070b16',
        background:
          'radial-gradient(circle at 18% 8%, rgba(245,158,11,0.18), transparent 30%), radial-gradient(circle at 82% 18%, rgba(239,68,68,0.12), transparent 28%), linear-gradient(180deg, #0f172a 0%, #070b16 48%, #050814 100%)',
      }}
    >
      <Paper
        square
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          px: { xs: 2, md: 4 },
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: 'rgba(8,12,24,0.82)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.32)',
        }}
      >
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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

      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Box flex={1} minWidth={0}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!room.readyToWatch && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Mời bạn bè bằng link, mỗi người thanh toán {money(room.pricePerMember)}. Khi tất cả đã thanh toán, cả phòng có thể bấm xem và video sẽ đồng bộ.
              </Alert>
            )}
            <Box
              sx={{
                position: 'relative',
                bgcolor: '#000',
                borderRadius: { xs: 3, md: 4 },
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 34px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(251,191,36,0.08)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: room.readyToWatch
                    ? 'linear-gradient(180deg, rgba(0,0,0,0.18), transparent 26%, rgba(0,0,0,0.38))'
                    : 'radial-gradient(circle at center, rgba(15,23,42,0.18), rgba(0,0,0,0.82))',
                  zIndex: 1,
                }}
              />
              <Box
                component="video"
                ref={videoRef}
                controls={room.readyToWatch}
                playsInline
                poster={room.posterUrl || undefined}
                onPlay={syncPlayback}
                onPause={syncPlayback}
                onSeeked={syncPlayback}
                sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', opacity: room.readyToWatch ? 1 : 0.55 }}
              />
              {!room.readyToWatch && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
                  <Box
                    sx={{
                      px: { xs: 2.5, md: 4 },
                      py: 3,
                      borderRadius: 4,
                      bgcolor: 'rgba(2,6,23,0.72)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
                      backdropFilter: 'blur(14px)',
                    }}
                  >
                    <Avatar sx={{ mx: 'auto', mb: 1.5, width: 54, height: 54, bgcolor: 'rgba(251,191,36,0.16)', color: '#fbbf24' }}>
                      <GroupsRoundedIcon />
                    </Avatar>
                    <Typography variant="h5" fontWeight={900}>Chờ cả nhóm thanh toán</Typography>
                    <Typography color="text.secondary" mt={1}>Video sẽ mở khi mọi thành viên trong phòng đã trả phần của mình.</Typography>
                  </Box>
                </Box>
              )}
              <Box sx={{ pointerEvents: 'none', position: 'absolute', right: 24, bottom: 24, zIndex: 3 }}>
                <Stack spacing={1}>
                  {reactions.map((item) => (
                    <Typography
                      key={item.id}
                      variant="h4"
                      sx={{
                        width: 56,
                        height: 56,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: 'rgba(15,23,42,0.72)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.38)',
                        textShadow: '0 8px 24px rgba(0,0,0,0.7)',
                        animation: 'watchPartyFloat 1.7s ease-out forwards',
                        '@keyframes watchPartyFloat': {
                          '0%': { opacity: 0, transform: 'translateY(18px) scale(0.72)' },
                          '18%': { opacity: 1, transform: 'translateY(0) scale(1.12)' },
                          '100%': { opacity: 0, transform: 'translateY(-96px) scale(0.92)' },
                        },
                      }}
                    >
                      {item.reaction}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              mt={2}
              sx={{
                width: 'fit-content',
                p: 0.75,
                borderRadius: 999,
                bgcolor: 'rgba(15,23,42,0.74)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 18px 46px rgba(0,0,0,0.28)',
                backdropFilter: 'blur(14px)',
              }}
            >
              {REACTION_OPTIONS.map((reaction) => (
                <Button
                  key={reaction.key}
                  variant="text"
                  startIcon={reaction.icon}
                  onClick={() => sendReaction(reaction.value)}
                  sx={{
                    minWidth: 0,
                    px: { xs: 1.35, sm: 1.65 },
                    py: 0.85,
                    borderRadius: 999,
                    color: '#e5e7eb',
                    fontWeight: 900,
                    textTransform: 'none',
                    '& .MuiButton-startIcon': { mr: 0.55, color: '#fbbf24' },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.10)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'transform 160ms ease, background-color 160ms ease',
                  }}
                >
                  <Box component="span" sx={{ mr: 0.5, fontSize: 18, lineHeight: 1 }}>{reaction.value}</Box>
                  {reaction.label}
                </Button>
              ))}
            </Stack>
          </Box>

          <Stack sx={{ width: { lg: 360 } }} spacing={2}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'rgba(30,41,59,0.84)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
              }}
            >
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

            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 440,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                bgcolor: 'rgba(30,41,59,0.84)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
              }}
            >
              <Typography fontWeight={900} mb={1}>Chat phòng</Typography>
              <Box flex={1} overflow="auto" pr={0.5}>
                <Stack spacing={1}>
                  {messages.map((message) => (
                    <Box key={message.id} sx={{ bgcolor: 'rgba(15,23,42,0.72)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, p: 1 }}>
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
