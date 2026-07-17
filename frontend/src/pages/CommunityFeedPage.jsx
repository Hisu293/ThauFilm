import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Rating,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SendIcon from '@mui/icons-material/Send';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import DynamicFeedRoundedIcon from '@mui/icons-material/DynamicFeedRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import ReviewsRoundedIcon from '@mui/icons-material/ReviewsRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';
import TopMovieFansWidget from '../components/TopMovieFansWidget';

const MAX_SOURCE_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_DATA_LENGTH = 2_700_000;
const MAX_POST_LENGTH = 5000;
const MAX_COMMENT_LENGTH = 1000;

const REACTIONS = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'HAHA', emoji: '😂', label: 'Haha' },
  { type: 'WOW', emoji: '😮', label: 'Wow' },
  { type: 'SAD', emoji: '😢', label: 'Buồn' },
  { type: 'ANGRY', emoji: '😡', label: 'Phẫn nộ' },
];

const reactionByType = (type) => REACTIONS.find((reaction) => reaction.type === type);

const formatDate = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

const resizeImage = (file) => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Vui lòng chọn đúng định dạng hình ảnh.'));
    return;
  }
  if (file.size > MAX_SOURCE_IMAGE_SIZE) {
    reject(new Error('Ảnh gốc không được vượt quá 8 MB.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Không thể đọc hình ảnh.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Hình ảnh không hợp lệ.'));
    image.onload = () => {
      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      let result = canvas.toDataURL('image/webp', 0.82);
      if (result.length > MAX_IMAGE_DATA_LENGTH) result = canvas.toDataURL('image/webp', 0.62);
      if (result.length > MAX_IMAGE_DATA_LENGTH) {
        reject(new Error('Ảnh vẫn quá lớn sau khi tối ưu. Vui lòng chọn ảnh khác.'));
        return;
      }
      resolve(result);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function ImagePicker({ imageUrl, onChange, disabled }) {
  const [processing, setProcessing] = useState(false);

  const selectImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setProcessing(true);
    try {
      onChange(await resizeImage(file), '');
    } catch (error) {
      onChange(imageUrl, error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box>
      {imageUrl && (
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Box
            component="img"
            src={imageUrl}
            alt="Ảnh bài viết"
            sx={{ width: '100%', maxHeight: 430, objectFit: 'contain', borderRadius: 3, bgcolor: 'action.hover' }}
          />
          <IconButton
            aria-label="Gỡ ảnh"
            onClick={() => onChange('', '')}
            disabled={disabled}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,.65)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <Button component="label" startIcon={<AddPhotoAlternateOutlinedIcon />} disabled={disabled || processing} sx={{ mt: 1 }}>
        {processing ? 'Đang tối ưu ảnh...' : imageUrl ? 'Đổi ảnh' : 'Thêm ảnh'}
        <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} />
      </Button>
    </Box>
  );
}

function AuthorActions({ userId, following, onFollowingChange, onMessage, onNotice }) {
  const [busy, setBusy] = useState(false);

  const toggleFollow = async () => {
    setBusy(true);
    try {
      if (following) await socialService.unfollow(userId);
      else await socialService.follow(userId);
      onFollowingChange(!following);
      onNotice({ severity: 'success', text: following ? 'Đã bỏ theo dõi.' : 'Đã theo dõi người dùng.' });
    } catch (error) {
      onNotice({ severity: 'error', text: error.message || 'Không thể cập nhật theo dõi.' });
    } finally {
      setBusy(false);
    }
  };

  return <Stack direction="row" spacing={.6} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
    <Button size="small" variant={following ? 'outlined' : 'contained'} disabled={busy} onClick={toggleFollow} startIcon={following ? <PersonRemoveRoundedIcon /> : <PersonAddRoundedIcon />} sx={{ borderRadius: 99, whiteSpace: 'nowrap' }}>{following ? 'Đang theo dõi' : 'Theo dõi'}</Button>
    <Button size="small" variant="text" onClick={onMessage} startIcon={<ChatRoundedIcon />} sx={{ borderRadius: 99, whiteSpace: 'nowrap' }}>Nhắn tin</Button>
  </Stack>;
}

function PostCard({ item, following, onFollowingChange, onEdit, onDelete, onMetrics, onNotice, onMessage }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const isEdited = item.updatedAt && item.createdAt
    && new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
  const currentReaction = reactionByType(item.myReaction);
  const totalReactions = Object.values(item.reactionCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0);

  const openComments = async () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (!nextOpen || comments.length > 0) return;
    setCommentsLoading(true);
    try {
      setComments(await socialService.getCommunityPostComments(item.postId) || []);
    } catch (error) {
      onNotice({ severity: 'error', text: error.message || 'Không thể tải bình luận.' });
    } finally {
      setCommentsLoading(false);
    }
  };

  const sendComment = async () => {
    const content = commentContent.trim();
    if (!content) return;
    setCommentSaving(true);
    try {
      const comment = await socialService.createCommunityPostComment(item.postId, content);
      setComments((current) => [...current, comment]);
      setCommentContent('');
      onMetrics(item.id, { commentCount: Number(item.commentCount || 0) + 1 });
    } catch (error) {
      onNotice({ severity: 'error', text: error.message || 'Không thể gửi bình luận.' });
    } finally {
      setCommentSaving(false);
    }
  };

  const removeComment = async (comment) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bình luận này?')) return;
    try {
      await socialService.deleteCommunityPostComment(item.postId, comment.id);
      setComments((current) => current.filter((candidate) => candidate.id !== comment.id));
      onMetrics(item.id, { commentCount: Math.max(0, Number(item.commentCount || 0) - 1) });
    } catch (error) {
      onNotice({ severity: 'error', text: error.message || 'Không thể xóa bình luận.' });
    }
  };

  const react = async (type) => {
    setReactionAnchor(null);
    try {
      const engagement = await socialService.reactToCommunityPost(item.postId, type);
      onMetrics(item.id, engagement);
    } catch (error) {
      onNotice({ severity: 'error', text: error.message || 'Không thể thả biểu cảm.' });
    }
  };

  const share = async () => {
    const shareUrl = `${window.location.origin}/community/feed?post=${item.postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bài viết cộng đồng ThauFilm', text: item.content || 'Xem bài viết này trên ThauFilm', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      const engagement = await socialService.shareCommunityPost(item.postId);
      onMetrics(item.id, engagement);
      onNotice({ severity: 'success', text: navigator.share ? 'Đã chia sẻ bài viết.' : 'Đã sao chép liên kết bài viết.' });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        onNotice({ severity: 'error', text: 'Không thể chia sẻ bài viết.' });
      }
    }
  };

  return (
    <Card id={`post-${item.postId}`} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, scrollMarginTop: 90 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <Avatar src={item.userAvatarUrl}>{(item.userFullName || 'U')[0]}</Avatar>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900}>{item.userFullName || 'Thành viên'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(item.createdAt)}{isEdited ? ' · Đã chỉnh sửa' : ''}
          </Typography>
        </Box>
        {!item.owner && item.userId && <AuthorActions userId={item.userId} following={following} onFollowingChange={onFollowingChange} onMessage={onMessage} onNotice={onNotice} />}
        {item.owner && (
          <>
            <IconButton aria-label="Tùy chọn bài viết" onClick={(event) => setAnchorEl(event.currentTarget)}>
              <MoreHorizIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); onEdit(item); }}>
                <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Sửa bài viết
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); onDelete(item); }} sx={{ color: 'error.main' }}>
                <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Xóa bài viết
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>
      {item.content && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content}</Typography>}
      {item.imageUrl && (
        <Box
          component="img"
          src={item.imageUrl}
          alt="Ảnh bài viết"
          sx={{ display: 'block', width: '100%', maxHeight: 620, objectFit: 'contain', mt: 2, borderRadius: 3, bgcolor: 'action.hover' }}
        />
      )}

      <Stack direction="row" justifyContent="space-between" mt={2} color="text.secondary">
        <Typography variant="caption">{totalReactions > 0 ? `${totalReactions} lượt bày tỏ cảm xúc` : ''}</Typography>
        <Typography variant="caption">
          {Number(item.commentCount || 0)} bình luận · {Number(item.shareCount || 0)} lượt chia sẻ
        </Typography>
      </Stack>
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" justifyContent="space-around">
        <Button
          color={currentReaction ? 'primary' : 'inherit'}
          onClick={(event) => setReactionAnchor(event.currentTarget)}
          sx={{ flex: 1 }}
        >
          {currentReaction ? `${currentReaction.emoji} ${currentReaction.label}` : '👍 Thích'}
        </Button>
        <Button startIcon={<ChatBubbleOutlineIcon />} onClick={openComments} color="inherit" sx={{ flex: 1 }}>
          Bình luận
        </Button>
        <Button startIcon={<ShareOutlinedIcon />} onClick={share} color="inherit" sx={{ flex: 1 }}>
          Chia sẻ
        </Button>
      </Stack>
      <Menu anchorEl={reactionAnchor} open={Boolean(reactionAnchor)} onClose={() => setReactionAnchor(null)}>
        <Stack direction="row" px={1}>
          {REACTIONS.map((reaction) => (
            <IconButton
              key={reaction.type}
              title={reaction.label}
              onClick={() => react(reaction.type)}
              sx={{ fontSize: 25, transform: item.myReaction === reaction.type ? 'scale(1.2)' : 'none' }}
            >
              {reaction.emoji}
            </IconButton>
          ))}
        </Stack>
      </Menu>

      <Collapse in={commentsOpen}>
        <Divider sx={{ my: 1.5 }} />
        {commentsLoading ? (
          <Box textAlign="center" py={2}><CircularProgress size={24} /></Box>
        ) : (
          <Stack spacing={1.5}>
            {comments.map((comment) => (
              <Stack key={comment.id} direction="row" spacing={1} alignItems="flex-start">
                <Avatar src={comment.userAvatarUrl} sx={{ width: 32, height: 32 }}>
                  {(comment.userFullName || 'U')[0]}
                </Avatar>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2.5, px: 1.5, py: 1, flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={800}>{comment.userFullName || 'Thành viên'}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.content}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(comment.createdAt)}</Typography>
                </Box>
                {comment.owner && (
                  <IconButton size="small" aria-label="Xóa bình luận" onClick={() => removeComment(comment)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ))}
            {comments.length === 0 && <Typography variant="body2" color="text.secondary">Chưa có bình luận.</Typography>}
          </Stack>
        )}
        <Stack direction="row" spacing={1} mt={2} alignItems="flex-end">
          <TextField
            value={commentContent}
            onChange={(event) => setCommentContent(event.target.value)}
            placeholder="Viết bình luận..."
            size="small"
            multiline
            maxRows={4}
            fullWidth
            inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendComment();
              }
            }}
          />
          <IconButton color="primary" onClick={sendComment} disabled={commentSaving || !commentContent.trim()}>
            {commentSaving ? <CircularProgress size={22} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </Collapse>
    </Card>
  );
}

function ReviewCard({ item, following, onFollowingChange, onNotice, onMessage }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <Avatar src={item.userAvatarUrl}>{(item.userFullName || 'U')[0]}</Avatar>
        <Box flex={1}>
          <Typography fontWeight={900}>{item.userFullName || 'Thành viên'}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt)} · Đánh giá phim</Typography>
        </Box>
        {!item.owner && item.userId && <AuthorActions userId={item.userId} following={following} onFollowingChange={onFollowingChange} onMessage={onMessage} onNotice={onNotice} />}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} mt={2.5}>
        {item.moviePosterUrl && (
          <Box component="img" src={item.moviePosterUrl} alt={item.movieTitle} sx={{ width: { xs: '100%', sm: 110 }, height: { xs: 210, sm: 160 }, objectFit: 'cover', borderRadius: 2 }} />
        )}
        <Box flex={1}>
          <Typography variant="h6" fontWeight={900}>{item.movieTitle}</Typography>
          <Rating value={Number(item.rating || 0)} readOnly size="small" sx={{ my: 1 }} />
          <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{item.content || 'Đã chấm điểm phim.'}</Typography>
          <Button component={RouterLink} to={`/movies/${item.movieId}/community`} sx={{ mt: 1.5 }}>Xem thảo luận</Button>
        </Box>
      </Stack>
    </Card>
  );
}

export default function CommunityFeedPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [followingIds, setFollowingIds] = useState(() => new Set());
  const [feedMode, setFeedMode] = useState('all');
  const [reviewMovieId, setReviewMovieId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageError, setEditImageError] = useState('');
  const reviewMovies = useMemo(() => {
    const movies = new Map();
    items.filter((item) => item.itemType === 'REVIEW' && item.movieId)
      .forEach((item) => movies.set(String(item.movieId), item.movieTitle || 'Phim chưa đặt tên'));
    return Array.from(movies, ([id, title]) => ({ id, title })).sort((left, right) => left.title.localeCompare(right.title, 'vi'));
  }, [items]);
  const visibleItems = useMemo(() => {
    if (feedMode !== 'reviews') return items;
    return items.filter((item) => item.itemType === 'REVIEW'
      && (reviewMovieId === 'all' || String(item.movieId) === reviewMovieId));
  }, [feedMode, items, reviewMovieId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feedItems, following] = await Promise.all([
        socialService.getCommunityFeed(),
        userId ? socialService.getFollowing(userId) : Promise.resolve([]),
      ]);
      setItems(feedItems || []);
      setFollowingIds(new Set((following || []).map((person) => String(person.id))));
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải bảng tin cộng đồng.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true, state: { from: '/community/feed' } });
      return undefined;
    }
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, load, navigate]);

  useEffect(() => {
    if (loading) return undefined;
    const postId = new URLSearchParams(window.location.search).get('post');
    if (!postId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items, loading]);

  const updatePostMetrics = useCallback((postId, metrics) => {
    setItems((current) => current.map((item) => item.id === postId ? { ...item, ...metrics } : item));
  }, []);

  const createPost = async () => {
    if (!content.trim() && !imageUrl) return;
    setSaving(true);
    try {
      const post = await socialService.createCommunityPost({ content: content.trim(), imageUrl: imageUrl || null });
      setItems((current) => [post, ...current]);
      setContent('');
      setImageUrl('');
      setImageError('');
      setNotice({ severity: 'success', text: 'Đã đăng bài viết.' });
    } catch (requestError) {
      setNotice({ severity: 'error', text: requestError.message || 'Không thể đăng bài viết.' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    setEditContent(item.content || '');
    setEditImageUrl(item.imageUrl || '');
    setEditImageError('');
  };

  const updatePost = async () => {
    if (!editing || (!editContent.trim() && !editImageUrl)) return;
    setSaving(true);
    try {
      const updated = await socialService.updateCommunityPost(editing.postId, {
        content: editContent.trim(),
        imageUrl: editImageUrl || null,
        removeImage: Boolean(editing.imageUrl && !editImageUrl),
      });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      setNotice({ severity: 'success', text: 'Đã cập nhật bài viết.' });
    } catch (requestError) {
      setNotice({ severity: 'error', text: requestError.message || 'Không thể cập nhật bài viết.' });
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (item) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài viết này?')) return;
    try {
      await socialService.deleteCommunityPost(item.postId);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setNotice({ severity: 'success', text: 'Đã xóa bài viết.' });
    } catch (requestError) {
      setNotice({ severity: 'error', text: requestError.message || 'Không thể xóa bài viết.' });
    }
  };

  const openMessage = (item) => {
    navigate(`/community/messages?userId=${item.userId}`);
  };

  const updateFollowing = (userId, following) => {
    setFollowingIds((current) => {
      const next = new Set(current);
      if (following) next.add(String(userId));
      else next.delete(String(userId));
      return next;
    });
  };

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 3 }, pb: { xs: 4, md: 7 }, minHeight: '75vh' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,900px) minmax(290px,360px)' }, gap: 3, alignItems: 'start' }}>
        <Box minWidth={0}>
      <Card sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar src={user?.avatar}>{(user?.fullName || user?.name || 'U')[0]}</Avatar>
          <Box flex={1} minWidth={0}>
            <TextField
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Bạn đang nghĩ gì về điện ảnh?"
              multiline
              minRows={2}
              maxRows={8}
              fullWidth
              inputProps={{ maxLength: MAX_POST_LENGTH }}
            />
            <ImagePicker
              imageUrl={imageUrl}
              disabled={saving}
              onChange={(nextImage, nextError) => { setImageUrl(nextImage); setImageError(nextError); }}
            />
            {imageError && <Alert severity="error" sx={{ mt: 1 }}>{imageError}</Alert>}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="caption" color="text.secondary">{content.length}/{MAX_POST_LENGTH}</Typography>
              <Button variant="contained" onClick={createPost} disabled={saving || Boolean(imageError) || (!content.trim() && !imageUrl)}>
                {saving ? 'Đang đăng...' : 'Đăng bài'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Card>

          <Card sx={{ p: 1.25, mb: 2.5, borderRadius: 4 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2} alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={1} flex={1}>
                <Button fullWidth variant={feedMode === 'all' ? 'contained' : 'text'} startIcon={<DynamicFeedRoundedIcon />} onClick={() => { setFeedMode('all'); setReviewMovieId('all'); }}>Bảng tin</Button>
                <Button fullWidth variant={feedMode === 'reviews' ? 'contained' : 'text'} startIcon={<ReviewsRoundedIcon />} onClick={() => setFeedMode('reviews')}>Review theo phim</Button>
              </Stack>
              {feedMode === 'reviews' && <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 230 } }}><InputLabel>Chọn phim</InputLabel><Select label="Chọn phim" value={reviewMovieId} onChange={(event) => setReviewMovieId(event.target.value)}><MenuItem value="all">Tất cả phim ({items.filter((item) => item.itemType === 'REVIEW').length})</MenuItem>{reviewMovies.map((movie) => <MenuItem key={movie.id} value={movie.id}>{movie.title}</MenuItem>)}</Select></FormControl>}
            </Stack>
            {feedMode === 'reviews' && <Stack direction="row" spacing={1} alignItems="center" mt={1.25} px={.5}><Chip size="small" icon={<ReviewsRoundedIcon />} label={`${visibleItems.length} review`} color="primary" variant="outlined" /><Typography variant="caption" color="text.secondary">Review từ những thành viên đã xem và đánh giá phim.</Typography></Stack>}
          </Card>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {loading ? (
            <Box textAlign="center" py={10}><CircularProgress /></Box>
          ) : visibleItems.length === 0 ? (
            <Alert severity="info">{feedMode === 'reviews' ? 'Chưa có review nào cho phim đã chọn.' : 'Chưa có bài viết. Hãy đăng bài đầu tiên hoặc theo dõi thêm bạn bè.'}</Alert>
          ) : (
            <Stack spacing={2.5}>
              {visibleItems.map((item) => item.itemType === 'POST'
                ? <PostCard key={`post-${item.id}`} item={item} following={followingIds.has(String(item.userId))} onFollowingChange={(following) => updateFollowing(item.userId, following)} onEdit={openEdit} onDelete={deletePost} onMetrics={updatePostMetrics} onNotice={setNotice} onMessage={() => openMessage(item)} />
                : <ReviewCard key={`review-${item.id || item.reviewId}`} item={item} following={followingIds.has(String(item.userId))} onFollowingChange={(following) => updateFollowing(item.userId, following)} onNotice={setNotice} onMessage={() => openMessage(item)} />)}
            </Stack>
          )}
        </Box>

        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 92 } }}>
          <TopMovieFansWidget />
        </Box>
      </Box>

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa bài viết</DialogTitle>
        <DialogContent>
          <TextField
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            multiline
            minRows={4}
            maxRows={10}
            fullWidth
            autoFocus
            inputProps={{ maxLength: MAX_POST_LENGTH }}
            sx={{ mt: 1 }}
          />
          <ImagePicker
            imageUrl={editImageUrl}
            disabled={saving}
            onChange={(nextImage, nextError) => { setEditImageUrl(nextImage); setEditImageError(nextError); }}
          />
          {editImageError && <Alert severity="error" sx={{ mt: 1 }}>{editImageError}</Alert>}
          <Typography variant="caption" color="text.secondary">{editContent.length}/{MAX_POST_LENGTH}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>Hủy</Button>
          <Button variant="contained" onClick={updatePost} disabled={saving || Boolean(editImageError) || (!editContent.trim() && !editImageUrl)}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : undefined}
      </Snackbar>
    </Container>
  );
}
