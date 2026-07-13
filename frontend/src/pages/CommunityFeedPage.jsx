import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CircularProgress, Container, Rating, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';

const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '';

export default function CommunityFeedPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await socialService.getCommunityFeed() || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải bảng tin cộng đồng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: '/community/feed' } });
      return undefined;
    }
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, load, navigate]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 }, minHeight: '75vh' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={4}>
        <Box>
          <Typography variant="h3" fontWeight={900}>Bảng tin cộng đồng</Typography>
          <Typography color="text.secondary">Review mới nhất từ những người bạn đang theo dõi.</Typography>
        </Box>
        <Button component={RouterLink} to="/community/connections" variant="outlined">Quản lý kết nối</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loading ? (
        <Box textAlign="center" py={10}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Chưa có bài viết. Hãy theo dõi người viết review để nội dung của họ xuất hiện tại đây.</Alert>
      ) : (
        <Stack spacing={2.5}>
          {items.map((item) => (
            <Card key={item.reviewId} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={item.userAvatarUrl}>{(item.userFullName || 'U')[0]}</Avatar>
                <Box flex={1}>
                  <Typography fontWeight={900}>{item.userFullName || 'Thành viên'}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt)}</Typography>
                </Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} mt={2.5}>
                {item.moviePosterUrl && <Box component="img" src={item.moviePosterUrl} alt={item.movieTitle} sx={{ width: { xs: '100%', sm: 110 }, height: { xs: 210, sm: 160 }, objectFit: 'cover', borderRadius: 2 }} />}
                <Box flex={1}>
                  <Typography variant="h6" fontWeight={900}>{item.movieTitle}</Typography>
                  <Rating value={Number(item.rating || 0)} readOnly size="small" sx={{ my: 1 }} />
                  <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{item.content || 'Đã chấm điểm phim.'}</Typography>
                  <Button component={RouterLink} to={`/movies/${item.movieId}/community`} sx={{ mt: 1.5 }}>Xem thảo luận</Button>
                </Box>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
