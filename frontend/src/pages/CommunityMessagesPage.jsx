import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CircularProgress, Container, Divider, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { connectRealtime } from '../services/realtimeService';
import { socialService } from '../services/socialService';

const formatTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '';

export default function CommunityMessagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoggedIn } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const partnerId = searchParams.get('userId') || '';

  const selectedConversation = useMemo(
    () => conversations.find((item) => String(item.userId) === String(partnerId)),
    [conversations, partnerId]
  );
  const canMessage = Boolean(selectedConversation?.mutualFollow || searchParams.get('mutual') === '1');

  const loadConversations = useCallback(async () => {
    setConversations(await socialService.getConversations() || []);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!partnerId) { setMessages([]); return; }
    setMessages(await socialService.getMessages(partnerId) || []);
  }, [partnerId]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: '/community/messages' } });
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        await Promise.all([loadConversations(), loadMessages()]);
        setError('');
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải hộp thư.');
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, loadConversations, loadMessages, navigate]);

  useEffect(() => connectRealtime({
    onEvent: (event) => {
      if (event.type !== 'SOCIAL_MESSAGE') return;
      const message = event.data;
      if (String(message?.senderId) === String(partnerId)) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
      loadConversations().catch(() => {});
    },
  }), [loadConversations, partnerId]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const selectPartner = (conversation) => {
    setSearchParams({ userId: conversation.userId, mutual: conversation.mutualFollow ? '1' : '0' });
  };

  const send = async () => {
    const text = content.trim();
    if (!text || !partnerId || !canMessage) return;
    setSending(true); setError('');
    try {
      const message = await socialService.sendMessage(partnerId, text);
      setMessages((current) => [...current, message]);
      setContent('');
      await loadConversations();
    } catch (requestError) {
      setError(requestError.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, minHeight: '78vh' }}>
      <Typography variant="h3" fontWeight={900} mb={3}>Tin nhắn cộng đồng</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box textAlign="center" py={10}><CircularProgress /></Box> : (
        <Card sx={{ minHeight: 590, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, overflow: 'hidden' }}>
          <Box sx={{ borderRight: { md: '1px solid rgba(148,163,184,.18)' }, borderBottom: { xs: '1px solid rgba(148,163,184,.18)', md: 0 } }}>
            <Typography fontWeight={900} p={2}>Cuộc trò chuyện</Typography>
            <Divider />
            <List sx={{ maxHeight: { xs: 220, md: 530 }, overflowY: 'auto' }}>
              {conversations.length === 0 && <Typography color="text.secondary" p={2}>Chưa có tin nhắn. Hãy nhắn từ trang Kết nối cộng đồng.</Typography>}
              {conversations.map((conversation) => (
                <ListItemButton key={conversation.userId} selected={String(partnerId) === String(conversation.userId)} onClick={() => selectPartner(conversation)}>
                  <Avatar src={conversation.avatarUrl} sx={{ mr: 1.5 }}>{(conversation.fullName || 'U')[0]}</Avatar>
                  <ListItemText primary={conversation.fullName} secondary={conversation.lastMessage} secondaryTypographyProps={{ noWrap: true }} />
                  {conversation.unreadCount > 0 && <Box sx={{ minWidth: 22, height: 22, borderRadius: 99, bgcolor: 'primary.main', color: '#111', textAlign: 'center', fontWeight: 900 }}>{conversation.unreadCount}</Box>}
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Stack sx={{ minWidth: 0, height: 590 }}>
            <Box p={2}>
              <Typography fontWeight={900}>{selectedConversation?.fullName || (partnerId ? 'Cuộc trò chuyện mới' : 'Chọn một cuộc trò chuyện')}</Typography>
              {partnerId && <Typography variant="caption" color={canMessage ? 'success.main' : 'warning.main'}>{canMessage ? 'Hai người đang theo dõi lẫn nhau' : 'Cần follow lẫn nhau để gửi tin'}</Typography>}
            </Box>
            <Divider />
            <Stack spacing={1.2} sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'rgba(2,6,23,.28)' }}>
              {messages.map((message) => {
                const mine = String(message.senderId) === String(user?.id);
                return <Box key={message.id} alignSelf={mine ? 'flex-end' : 'flex-start'} sx={{ maxWidth: '75%', px: 1.8, py: 1.2, borderRadius: 3, bgcolor: mine ? 'primary.main' : 'rgba(51,65,85,.9)', color: mine ? '#111' : '#fff' }}><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Typography><Typography variant="caption" sx={{ opacity: .7 }}>{formatTime(message.createdAt)}</Typography></Box>;
              })}
              <div ref={bottomRef} />
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1} p={2}>
              <TextField fullWidth size="small" placeholder={canMessage ? 'Nhập tin nhắn...' : 'Hai người cần follow lẫn nhau'} value={content} disabled={!partnerId || !canMessage} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} />
              <Button variant="contained" disabled={sending || !content.trim() || !canMessage} onClick={send}><SendRoundedIcon /></Button>
            </Stack>
          </Stack>
        </Card>
      )}
    </Container>
  );
}
