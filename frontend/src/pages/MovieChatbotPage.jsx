import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import MovieCreationRoundedIcon from '@mui/icons-material/MovieCreationRounded';
import { movieChatbotService } from '../services/movieChatbotService';

const quickPrompts = [
  'Tôi thích phim giống Interstellar',
  'Có phim nào dưới 2 tiếng không?',
  'Gợi ý phim viễn tưởng đáng xem',
  'Tôi muốn xem phim nhẹ nhàng cuối tuần',
];

const initialMessages = [
  {
    role: 'bot',
    text: 'Bạn muốn xem phim theo gu nào? Hỏi mình theo tên phim, thể loại, thời lượng hoặc tâm trạng hôm nay.',
    recommendations: [],
  },
];

const MovieChatbotPage = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const sendMessage = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { role: 'user', text }]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await movieChatbotService.chat(text);
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: response?.answer || 'Mình chưa tìm được gợi ý phù hợp.',
          recommendations: response?.recommendations || [],
        },
      ]);
    } catch (err) {
      setError(err.message || 'Không thể tư vấn phim lúc này.');
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, minHeight: '78vh' }}>
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <AutoAwesomeRoundedIcon color="primary" />
            <Typography variant="h3" fontWeight={900}>
              AI Chatbot tư vấn phim
            </Typography>
          </Stack>
          <Typography color="text.secondary">
            Hỏi theo gu phim, thời lượng, thể loại hoặc một phim bạn từng thích. Chatbot chỉ gợi ý phim đang có trong hệ thống ThauFilm.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {quickPrompts.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              icon={<MovieCreationRoundedIcon />}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              sx={{ borderRadius: '8px', fontWeight: 700 }}
            />
          ))}
        </Stack>

        <Card sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(18,18,18,0.92)' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5} sx={{ minHeight: 420 }}>
              {messages.map((message, index) => (
                <ChatMessage key={`${message.role}-${index}`} message={message} />
              ))}

              {loading && (
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">Đang phân tích gu phim...</Typography>
                </Stack>
              )}

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ví dụ: Tôi thích phim giống Interstellar"
                  disabled={loading}
                  size="medium"
                />
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={loading || !input.trim()}
                  sx={{ width: 52, height: 52, borderRadius: '8px', bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <SendRoundedIcon />
                </IconButton>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

const ChatMessage = ({ message }) => {
  const isBot = message.role === 'bot';
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent={isBot ? 'flex-start' : 'flex-end'}>
      {isBot && <AvatarIcon bot />}
      <Box sx={{ maxWidth: { xs: '86%', md: '72%' } }}>
        <Box
          sx={{
            px: 2,
            py: 1.4,
            borderRadius: 2,
            bgcolor: isBot ? 'rgba(255,255,255,0.06)' : 'primary.main',
            color: isBot ? 'text.primary' : '#fff',
            whiteSpace: 'pre-line',
          }}
        >
          <Typography variant="body1">{message.text}</Typography>
        </Box>
        {message.recommendations?.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            {message.recommendations.map((movie) => (
              <MovieSuggestion key={movie.id} movie={movie} />
            ))}
          </Box>
        )}
      </Box>
      {!isBot && <AvatarIcon />}
    </Stack>
  );
};

const AvatarIcon = ({ bot = false }) => (
  <Box
    sx={{
      width: 36,
      height: 36,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      bgcolor: bot ? 'rgba(229,9,20,0.18)' : 'rgba(255,255,255,0.08)',
      color: bot ? 'primary.main' : 'text.secondary',
      flexShrink: 0,
    }}
  >
    {bot ? <SmartToyRoundedIcon fontSize="small" /> : <PersonRoundedIcon fontSize="small" />}
  </Box>
);

const MovieSuggestion = ({ movie }) => {
  const poster = movie.posterUrl && !movie.posterUrl.includes('example.com') ? movie.posterUrl : '/placeholder.svg';
  return (
    <Card sx={{ borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5}>
          <Box
            component="img"
            src={poster}
            alt={movie.title}
            sx={{ width: 70, aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)' }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={900} noWrap>{movie.title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8 }}>
              {movie.genre || 'Đang cập nhật'}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              <Chip size="small" icon={<AccessTimeRoundedIcon />} label={`${movie.durationMinutes || '?'} phút`} />
              <Chip size="small" icon={<StarRoundedIcon />} label={movie.rating ?? 'N/A'} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {movie.reason}
            </Typography>
            <Button component={RouterLink} to={`/movies/${movie.id}`} size="small" variant="outlined">
              Xem chi tiết
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MovieChatbotPage;
