import { useCallback, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CircularProgress, Container, Grid, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';

const ConnectionCard = ({ person, knownFollowing, onChanged, onNotice }) => {
  const [following, setFollowing] = useState(Boolean(knownFollowing));
  const [busy, setBusy] = useState(!knownFollowing);

  useEffect(() => {
    if (knownFollowing) return undefined;
    let active = true;
    socialService.getFollowStatus(person.id).then((result) => { if (active) setFollowing(Boolean(result?.isFollowing)); }).catch(() => {}).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [knownFollowing, person.id]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (following) await socialService.unfollow(person.id); else await socialService.follow(person.id);
      setFollowing(!following); onNotice({ severity: 'success', text: following ? 'Đã hủy theo dõi.' : 'Đã theo dõi.' }); onChanged();
    } catch (error) { onNotice({ severity: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  return <Card sx={{ p: 2.5 }}><Stack direction="row" alignItems="center" spacing={2}><Avatar src={person.avatarUrl} sx={{ width: 52, height: 52 }}>{(person.fullName || 'U')[0]}</Avatar><Box flex={1}><Typography fontWeight={800}>{person.fullName || 'Thành viên'}</Typography><Typography variant="caption" color="text.secondary">Theo dõi từ {new Date(person.followedAt).toLocaleDateString('vi-VN')}</Typography></Box><Button variant={following ? 'outlined' : 'contained'} disabled={busy} onClick={toggle} startIcon={following ? <PersonRemoveRoundedIcon /> : <PersonAddRoundedIcon />}>{following ? 'Bỏ theo dõi' : 'Theo dõi'}</Button></Stack></Card>;
};

export default function CommunityConnectionsPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [tab, setTab] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [followersData, followingData] = await Promise.all([socialService.getFollowers(userId), socialService.getFollowing(userId)]);
      setFollowers(followersData || []); setFollowing(followingData || []);
    } catch (error) { setNotice({ severity: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login', { replace: true }); return undefined; }
    const request = window.setTimeout(load, 0);
    return () => window.clearTimeout(request);
  }, [isLoggedIn, load, navigate]);

  const people = tab === 0 ? followers : following;
  return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 }, minHeight: '75vh' }}><Typography variant="h3" fontWeight={900}>Kết nối cộng đồng</Typography><Typography color="text.secondary" mb={3}>Quản lý những người bạn theo dõi trong cộng đồng yêu phim.</Typography><Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}><Tab label={`Người theo dõi (${followers.length})`} /><Tab label={`Đang theo dõi (${following.length})`} /></Tabs>{loading ? <Box textAlign="center" py={8}><CircularProgress /></Box> : people.length === 0 ? <Alert severity="info">Chưa có kết nối nào trong mục này.</Alert> : <Grid container spacing={2}>{people.map((person) => <Grid key={person.id} size={{ xs: 12, md: 6 }}><ConnectionCard person={person} knownFollowing={tab === 1} onChanged={load} onNotice={setNotice} /></Grid>)}</Grid>}<Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>{notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : undefined}</Snackbar></Container>;
}
