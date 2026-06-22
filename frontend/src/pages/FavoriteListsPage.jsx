import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, CardMedia, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid,
  IconButton, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';

export default function FavoriteListsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summaries = await socialService.getFavoriteLists() || [];
      const details = await Promise.all(summaries.map((item) => socialService.getFavoriteList(item.id)));
      setLists(details);
    } catch (error) { setNotice({ severity: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login', { replace: true }); return undefined; }
    const request = window.setTimeout(load, 0);
    return () => window.clearTimeout(request);
  }, [isLoggedIn, load, navigate]);

  const openCreate = () => { setName(''); setIsPublic(false); setDialog({ mode: 'create' }); };
  const openEdit = (list) => { setName(list.name); setIsPublic(Boolean(list.isPublic)); setDialog({ mode: 'edit', list }); };

  const save = async () => {
    if (!name.trim()) return;
    try {
      if (dialog.mode === 'create') await socialService.createFavoriteList(name.trim(), isPublic);
      else await socialService.updateFavoriteList(dialog.list.id, { name: name.trim(), isPublic });
      setDialog(null); await load();
    } catch (error) { setNotice({ severity: 'error', text: error.message }); }
  };

  const removeList = async (listId) => {
    if (!window.confirm('Xóa danh sách này?')) return;
    try { await socialService.deleteFavoriteList(listId); await load(); }
    catch (error) { setNotice({ severity: 'error', text: error.message }); }
  };

  const removeMovie = async (listId, movieId) => {
    try { await socialService.removeMovieFromList(listId, movieId); await load(); }
    catch (error) { setNotice({ severity: 'error', text: error.message }); }
  };

  const share = async (list) => {
    if (!list.isPublic) {
      setNotice({ severity: 'warning', text: 'Hãy chuyển danh sách sang công khai trước khi chia sẻ.' });
      return;
    }
    const url = `${window.location.origin}/lists/${list.id}`;
    try {
      if (navigator.share) await navigator.share({ title: list.name, url });
      else await navigator.clipboard.writeText(url);
      setNotice({ severity: 'success', text: 'Đã chia sẻ danh sách.' });
    } catch (error) { if (error.name !== 'AbortError') setNotice({ severity: 'error', text: 'Không thể chia sẻ.' }); }
  };

  return <Container maxWidth="xl" sx={{ py: { xs: 4, md: 7 }, minHeight: '75vh' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={4}>
      <Box><Typography variant="h3" fontWeight={900}>Danh sách phim của tôi</Typography><Typography color="text.secondary">Tạo, chỉnh sửa và chia sẻ bộ sưu tập phim.</Typography></Box>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>Tạo danh sách</Button>
    </Stack>
    {loading && <Box textAlign="center" py={8}><CircularProgress /></Box>}
    {!loading && lists.length === 0 && <Alert severity="info">Bạn chưa có danh sách phim nào.</Alert>}
    <Stack spacing={4}>{lists.map((list) => <Box key={list.id}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Typography variant="h5" fontWeight={800}>{list.name}</Typography>
        <Chip size="small" label={list.isPublic ? 'Công khai' : 'Riêng tư'} color={list.isPublic ? 'success' : 'default'} />
        <Typography color="text.secondary">{list.movieCount} phim</Typography>
        <Box flex={1} />
        <IconButton onClick={() => share(list)}><ShareRoundedIcon /></IconButton>
        <IconButton onClick={() => openEdit(list)}><EditRoundedIcon /></IconButton>
        <IconButton color="error" onClick={() => removeList(list.id)}><DeleteOutlineRoundedIcon /></IconButton>
      </Stack>
      {list.movies?.length === 0 ? <Card variant="outlined" sx={{ p: 3 }}><Typography color="text.secondary">Danh sách chưa có phim. Thêm phim từ trang cộng đồng của một bộ phim.</Typography></Card> : <Grid container spacing={2}>{list.movies?.map((movie) => <Grid key={movie.id} size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }}><Card sx={{ height: '100%' }}><CardMedia component="img" image={movie.posterUrl || '/placeholder.svg'} alt={movie.title} sx={{ aspectRatio: '2/3', objectFit: 'cover', cursor: 'pointer' }} onClick={() => navigate(`/movies/${movie.id}`)} /><CardContent><Typography fontWeight={800} noWrap>{movie.title}</Typography></CardContent><CardActions><Button size="small" onClick={() => navigate(`/movies/${movie.id}`)}>Chi tiết</Button><Button size="small" color="error" onClick={() => removeMovie(list.id, movie.id)}>Bỏ phim</Button></CardActions></Card></Grid>)}</Grid>}
    </Box>)}</Stack>
    <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="xs"><DialogTitle>{dialog?.mode === 'create' ? 'Tạo danh sách' : 'Sửa danh sách'}</DialogTitle><DialogContent><TextField fullWidth autoFocus label="Tên danh sách" value={name} onChange={(event) => setName(event.target.value)} sx={{ mt: 1 }} /><FormControlLabel control={<Switch checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />} label="Cho phép chia sẻ công khai" sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setDialog(null)}>Hủy</Button><Button variant="contained" onClick={save}>Lưu</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>{notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : undefined}</Snackbar>
  </Container>;
}
