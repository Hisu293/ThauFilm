import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';

const MAX_SOURCE_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_DATA_LENGTH = 2_700_000;
const MAX_POST_LENGTH = 5000;

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

function PostCard({ item, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const isEdited = item.updatedAt && item.createdAt
    && new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;

  return (
    <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={item.userAvatarUrl}>{(item.userFullName || 'U')[0]}</Avatar>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900}>{item.userFullName || 'Thành viên'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(item.createdAt)}{isEdited ? ' · Đã chỉnh sửa' : ''}
          </Typography>
        </Box>
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
    </Card>
  );
}

function ReviewCard({ item }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={item.userAvatarUrl}>{(item.userFullName || 'U')[0]}</Avatar>
        <Box flex={1}>
          <Typography fontWeight={900}>{item.userFullName || 'Thành viên'}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt)} · Đánh giá phim</Typography>
        </Box>
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
  const [items, setItems] = useState([]);
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

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 }, minHeight: '75vh' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
        sx={{ alignSelf: 'flex-start', mb: 2 }}
      >
        Quay lại
      </Button>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={4}>
        <Box>
          <Typography variant="h3" fontWeight={900}>Bảng tin cộng đồng</Typography>
          <Typography color="text.secondary">Chia sẻ khoảnh khắc và cập nhật mới từ những người bạn theo dõi.</Typography>
        </Box>
        <Button component={RouterLink} to="/community/connections" variant="outlined">Quản lý kết nối</Button>
      </Stack>

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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loading ? (
        <Box textAlign="center" py={10}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Chưa có bài viết. Hãy đăng bài đầu tiên hoặc theo dõi thêm bạn bè.</Alert>
      ) : (
        <Stack spacing={2.5}>
          {items.map((item) => item.itemType === 'POST'
            ? <PostCard key={`post-${item.id}`} item={item} onEdit={openEdit} onDelete={deletePost} />
            : <ReviewCard key={`review-${item.id || item.reviewId}`} item={item} />)}
        </Stack>
      )}

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
