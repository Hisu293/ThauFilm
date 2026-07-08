import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import ReviewsRoundedIcon from '@mui/icons-material/ReviewsRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { connectRealtime } from '../../services/realtimeService';
import { socialService } from '../../services/socialService';

const panelSx = {
  borderRadius: 4,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  bgcolor: 'rgba(15, 23, 42, 0.82)',
  boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
  backgroundImage: 'linear-gradient(180deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.9))',
};

const softPanelSx = {
  borderRadius: 4,
  border: '1px solid rgba(148, 163, 184, 0.16)',
  bgcolor: 'rgba(2, 12, 27, 0.72)',
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  : '';

const parseAiSummary = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return { overall: value };
  }
};

const getInitial = (item) => (item.userFullName || item.fullName || 'U').charAt(0).toUpperCase();

const FollowButton = ({ userId, onNotice }) => {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    socialService.getFollowStatus(userId)
      .then((result) => { if (active) setFollowing(Boolean(result?.isFollowing)); })
      .catch(() => {})
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [userId]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (following) await socialService.unfollow(userId);
      else await socialService.follow(userId);
      setFollowing(!following);
      onNotice({ severity: 'success', text: following ? 'Đã hủy theo dõi.' : 'Đã theo dõi người dùng.' });
    } catch (error) {
      onNotice({ severity: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="small"
      disabled={busy}
      onClick={toggle}
      startIcon={following ? <PersonRemoveRoundedIcon /> : <PersonAddRoundedIcon />}
      sx={{ borderRadius: 999, px: 1.6 }}
      variant={following ? 'outlined' : 'contained'}
    >
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </Button>
  );
};

const UserLine = ({ item, canFollow, onNotice }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Avatar
      src={item.userAvatarUrl || item.avatarUrl}
      sx={{
        width: 42,
        height: 42,
        border: '1px solid rgba(255,255,255,.16)',
        bgcolor: 'rgba(250, 204, 21, .18)',
        color: '#facc15',
        fontWeight: 800,
      }}
    >
      {getInitial(item)}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography fontWeight={800} noWrap>{item.userFullName || item.fullName || 'Thành viên'}</Typography>
      <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt || item.followedAt)}</Typography>
    </Box>
    {canFollow && <FollowButton userId={item.userId || item.id} onNotice={onNotice} />}
  </Stack>
);

const CommentItem = ({ comment, depth = 0, currentUserId, editingId, editText, replyId, replyText, actions }) => (
  <Box
    sx={{
      ml: Math.min(depth, 3) * 2,
      pl: depth ? 2 : 0,
      borderLeft: depth ? '2px solid rgba(56, 189, 248, .22)' : 0,
    }}
  >
    <UserLine item={comment} canFollow={false} />
    {editingId === comment.id ? (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1.25} ml={{ xs: 0, sm: 7 }}>
        <TextField fullWidth size="small" value={editText} onChange={(event) => actions.setEditText(event.target.value)} />
        <Button variant="contained" onClick={() => actions.saveEdit(comment.id)}>Lưu</Button>
      </Stack>
    ) : (
      <Typography mt={1.25} ml={{ xs: 0, sm: 7 }} sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
        {comment.content}
      </Typography>
    )}
    <Stack direction="row" spacing={0.5} ml={{ xs: 0, sm: 6 }} mt={0.75}>
      <Button size="small" startIcon={<ReplyRoundedIcon />} onClick={() => actions.startReply(comment.id)}>
        Trả lời
      </Button>
      {String(comment.userId) === String(currentUserId) && (
        <>
          <IconButton size="small" onClick={() => actions.startEdit(comment)}><EditRoundedIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => actions.remove(comment.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
        </>
      )}
    </Stack>
    {replyId === comment.id && (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1} ml={{ xs: 0, sm: 7 }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={replyText}
          onChange={(event) => actions.setReplyText(event.target.value)}
          placeholder="Viết phản hồi..."
        />
        <IconButton color="primary" onClick={() => actions.saveReply(comment.id)}><SendRoundedIcon /></IconButton>
      </Stack>
    )}
    <Stack spacing={2} mt={(comment.replies || []).length ? 2 : 0}>
      {(comment.replies || []).map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          currentUserId={currentUserId}
          editingId={editingId}
          editText={editText}
          replyId={replyId}
          replyText={replyText}
          actions={actions}
        />
      ))}
    </Stack>
  </Box>
);

export default function MovieCommunity({ movieId }) {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [favoriteOpen, setFavoriteOpen] = useState(false);
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [notice, setNotice] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyCommentId, setReplyCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const positivePercentage = summary?.positivePercentage || 0;
  const averageRating = Number(summary?.averageRating || 0);
  const totalReviews = summary?.totalReviews || 0;
  const canWriteReview = eligible || myReview;

  const reviewHint = useMemo(() => {
    if (!isLoggedIn) return 'Đăng nhập và mua vé để viết đánh giá xác thực.';
    return 'Suất rạp mở đánh giá sau khi kết thúc. Suất online mở đánh giá từ giờ chiếu đã thanh toán.';
  }, [isLoggedIn]);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewData, commentData, summaryData, eligibilityData, myReviewData] = await Promise.all([
        socialService.getReviews(movieId),
        socialService.getComments(movieId),
        socialService.getSummary(movieId),
        socialService.getReviewEligibility(movieId),
        isLoggedIn ? socialService.getMyReview(movieId) : Promise.resolve(null),
      ]);
      setReviews(reviewData || []);
      setComments(commentData || []);
      setSummary(summaryData);
      setEligible(Boolean(eligibilityData?.eligible));
      setMyReview(myReviewData || null);
      if (myReviewData) {
        setRating(myReviewData.rating);
        setReviewText(myReviewData.content || '');
      }
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, movieId]);

  useEffect(() => {
    const request = window.setTimeout(loadCommunity, 0);
    return () => window.clearTimeout(request);
  }, [loadCommunity]);

  useEffect(() => connectRealtime({
    movieId,
    onEvent: (event) => {
      if (!String(event.type || '').startsWith('COMMENT_')) return;
      socialService.getComments(movieId).then((items) => setComments(items || [])).catch(() => {});
    },
  }), [movieId]);

  const requireLogin = () => {
    if (isLoggedIn) return true;
    navigate('/login', { state: { from: `/movies/${movieId}/community` } });
    return false;
  };

  const refreshComments = async () => setComments(await socialService.getComments(movieId) || []);

  const submitReview = async () => {
    if (!requireLogin()) return;
    setSaving(true);
    try {
      if (myReview) await socialService.updateReview(movieId, myReview.id, { rating, content: reviewText.trim() });
      else await socialService.createReview(movieId, { rating, content: reviewText.trim() });
      setNotice({ severity: 'success', text: myReview ? 'Đã cập nhật đánh giá.' : 'Đã đăng đánh giá.' });
      await loadCommunity();
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await socialService.deleteReview(movieId, reviewId);
      setRating(5);
      setReviewText('');
      await loadCommunity();
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !requireLogin()) return;
    setSaving(true);
    try {
      await socialService.createComment(movieId, commentText.trim());
      setCommentText('');
      await refreshComments();
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const commentActions = {
    setEditText: setEditCommentText,
    setReplyText,
    startEdit: (comment) => { setEditingCommentId(comment.id); setEditCommentText(comment.content); },
    startReply: (id) => { if (requireLogin()) { setReplyCommentId(id); setReplyText(''); } },
    saveEdit: async (id) => {
      if (!editCommentText.trim()) return;
      try {
        await socialService.updateComment(movieId, id, editCommentText.trim());
        setEditingCommentId(null);
        await refreshComments();
      } catch (error) {
        setNotice({ severity: 'error', text: error.message });
      }
    },
    saveReply: async (id) => {
      if (!replyText.trim()) return;
      try {
        await socialService.createComment(movieId, replyText.trim(), id);
        setReplyCommentId(null);
        setReplyText('');
        await refreshComments();
      } catch (error) {
        setNotice({ severity: 'error', text: error.message });
      }
    },
    remove: async (id) => {
      try {
        await socialService.deleteComment(movieId, id);
        await refreshComments();
      } catch (error) {
        setNotice({ severity: 'error', text: error.message });
      }
    },
  };

  const generateAiSummary = async () => {
    setAiLoading(true);
    try {
      const result = await socialService.getAiSummary(movieId);
      setSummary(result);
      setAi(parseAiSummary(result?.aiSummary));
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    } finally {
      setAiLoading(false);
    }
  };

  const openFavorites = async () => {
    if (!requireLogin()) return;
    setFavoriteOpen(true);
    try {
      setLists(await socialService.getFavoriteLists() || []);
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    }
  };

  const addToList = async (listId) => {
    try {
      await socialService.addMovieToList(listId, movieId);
      setFavoriteOpen(false);
      setNotice({ severity: 'success', text: 'Đã thêm phim vào danh sách.' });
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    }
  };

  const shareList = async (event, list) => {
    event.stopPropagation();
    const url = `${window.location.origin}/lists/${list.id}`;
    try {
      if (navigator.share) await navigator.share({ title: list.name, url });
      else await navigator.clipboard.writeText(url);
      setNotice({ severity: 'success', text: 'Đã chia sẻ danh sách.' });
    } catch (error) {
      if (error.name !== 'AbortError') setNotice({ severity: 'error', text: 'Không thể chia sẻ.' });
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      const list = await socialService.createFavoriteList(newListName.trim(), true);
      setNewListName('');
      await addToList(list.id);
    } catch (error) {
      setNotice({ severity: 'error', text: error.message });
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: { xs: 3, md: 5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2.5} mb={3}>
        <Box>
          <Chip
            icon={<ReviewsRoundedIcon />}
            label="Cộng đồng sau suất chiếu"
            sx={{ mb: 1.5, bgcolor: 'rgba(56, 189, 248, .12)', color: '#67e8f9', fontWeight: 800 }}
          />
          <Typography variant="h4" fontWeight={900}>Đánh giá cộng đồng</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
            Review xác thực từ người đã mua vé, thảo luận theo thời gian thực và danh sách phim cá nhân.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<BookmarkAddRoundedIcon />}
          onClick={openFavorites}
          sx={{ alignSelf: { xs: 'stretch', md: 'center' }, borderRadius: 3, px: 2.5, minHeight: 52 }}
        >
          Thêm vào danh sách
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ ...panelSx, p: 3, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <AutoAwesomeRoundedIcon sx={{ color: '#facc15' }} />
              <Typography variant="h6" fontWeight={900}>Tổng quan review</Typography>
              <Chip size="small" label="AI" sx={{ ml: 'auto', bgcolor: '#facc15', color: '#111827', fontWeight: 900 }} />
            </Stack>

            <Stack direction="row" spacing={2.5} alignItems="center" mb={2.5}>
              <Box>
                <Typography variant="h2" fontWeight={900} lineHeight={1}>{averageRating.toFixed(1)}</Typography>
                <Rating value={averageRating} readOnly precision={0.1} emptyIcon={<StarRoundedIcon fontSize="inherit" />} />
              </Box>
              <Box flex={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={800}>Hài lòng</Typography>
                  <Typography fontWeight={900} color="#22c55e">{positivePercentage}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={positivePercentage}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    my: 1,
                    bgcolor: 'rgba(148, 163, 184, .18)',
                    '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: '#22c55e' },
                  }}
                />
                <Typography variant="caption" color="text.secondary">Từ {totalReviews} đánh giá</Typography>
              </Box>
            </Stack>

            {ai ? (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
                {ai.overall}
                {ai.positives?.length > 0 && (
                  <Typography variant="body2" mt={1}>Điểm mạnh: {ai.positives.join(' • ')}</Typography>
                )}
                {ai.negatives?.length > 0 && (
                  <Typography variant="body2" mt={1}>Cần cân nhắc: {ai.negatives.join(' • ')}</Typography>
                )}
              </Alert>
            ) : (
              <Box sx={{ ...softPanelSx, p: 2, mb: 2 }}>
                <Typography color="text.secondary">
                  AI sẽ tóm tắt cảm nhận chung khi phim có đánh giá đầu tiên.
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              disabled={aiLoading || !totalReviews}
              onClick={generateAiSummary}
              startIcon={<AutoAwesomeRoundedIcon />}
              sx={{ borderRadius: 3, py: 1.2 }}
            >
              {aiLoading ? 'Đang phân tích...' : 'Tóm tắt bằng AI'}
            </Button>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ ...panelSx, p: { xs: 2.25, md: 3 }, height: '100%' }}>
            <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
              <LockOpenRoundedIcon sx={{ color: canWriteReview ? '#22c55e' : '#38bdf8' }} />
              <Box>
                <Typography variant="h6" fontWeight={900}>
                  {myReview ? 'Cập nhật đánh giá của bạn' : canWriteReview ? 'Bạn thấy phim này thế nào?' : 'Điều kiện viết đánh giá'}
                </Typography>
                <Typography variant="body2" color="text.secondary">{reviewHint}</Typography>
              </Box>
            </Stack>

            {canWriteReview ? (
              <Box>
                <Rating
                  value={rating}
                  onChange={(_, value) => setRating(value || 1)}
                  size="large"
                  sx={{ mb: 2, '& .MuiRating-iconFilled': { color: '#facc15' } }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Chia sẻ cảm nhận thật của bạn sau khi xem phim..."
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: 'rgba(15, 23, 42, .72)',
                    },
                  }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button variant="contained" disabled={saving} onClick={submitReview} sx={{ borderRadius: 3, px: 3 }}>
                    {myReview ? 'Cập nhật đánh giá' : 'Đăng đánh giá'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Đánh giá của bạn giúp các thành viên chọn phim chính xác hơn.
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <Alert severity={isLoggedIn ? 'info' : 'warning'} sx={{ borderRadius: 3 }}>
                {reviewHint}
              </Alert>
            )}
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} mt={1}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" my={2}>
            <Typography variant="h5" fontWeight={900}>Đánh giá ({reviews.length})</Typography>
          </Stack>
          <Stack spacing={2}>
            {reviews.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>Chưa có đánh giá. Hãy là người đầu tiên sau khi đủ điều kiện.</Alert>
            )}
            {reviews.map((review) => (
              <Card key={review.id} sx={{ ...softPanelSx, p: 2.5 }}>
                <UserLine
                  item={review}
                  canFollow={isLoggedIn && String(review.userId) !== String(user?.id)}
                  onNotice={setNotice}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
                  <Rating value={review.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#facc15' } }} />
                  {myReview?.id === review.id && (
                    <IconButton size="small" onClick={() => deleteReview(review.id)}><DeleteOutlineRoundedIcon /></IconButton>
                  )}
                </Stack>
                {review.content && <Typography mt={1.5} color="text.secondary">{review.content}</Typography>}
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h5" fontWeight={900} my={2}>Bình luận ({comments.length})</Typography>
          <Card sx={{ ...panelSx, p: 2.5 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Viết bình luận..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton color="primary" onClick={submitComment} disabled={saving || !commentText.trim()}>
                <SendRoundedIcon />
              </IconButton>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2.5}>
              {comments.length === 0 && <Typography color="text.secondary">Chưa có bình luận.</Typography>}
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  editingId={editingCommentId}
                  editText={editCommentText}
                  replyId={replyCommentId}
                  replyText={replyText}
                  actions={commentActions}
                />
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={favoriteOpen} onClose={() => setFavoriteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Chọn danh sách</DialogTitle>
        <DialogContent>
          <List>
            {lists.map((list) => (
              <ListItemButton key={list.id} onClick={() => addToList(list.id)}>
                <ListItemText primary={list.name} secondary={`${list.movieCount} phim • ${list.isPublic ? 'Công khai' : 'Riêng tư'}`} />
                {list.isPublic && <IconButton onClick={(event) => shareList(event, list)}><ShareRoundedIcon /></IconButton>}
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField fullWidth size="small" label="Tên danh sách mới" value={newListName} onChange={(event) => setNewListName(event.target.value)} />
            <Button variant="contained" onClick={createList}>Tạo</Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setFavoriteOpen(false)}>Đóng</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
