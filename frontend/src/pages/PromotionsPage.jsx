import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import FastfoodRoundedIcon from '@mui/icons-material/FastfoodRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyState from '../components/common/EmptyState';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';

const TABS = { ALL: 'all', DISCOUNTS: 'discounts', COMBOS: 'combos', REWARDS: 'rewards' };
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const dateText = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không giới hạn' : date.toLocaleDateString('vi-VN');
};
const unwrap = (response) => response?.data ?? response;

const PromotionsPage = () => {
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = useState(TABS.ALL);
  const [loading, setLoading] = useState(true);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');
  const [redeemingId, setRedeemingId] = useState('');
  const [confirmReward, setConfirmReward] = useState(null);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [discountResult, comboResult] = await Promise.allSettled([
        bookingApi.fetchActiveDiscounts(), bookingApi.fetchActiveCombos(),
      ]);
      if (!active) return;
      setDiscounts(discountResult.status === 'fulfilled' ? bookingService.normalizeDiscounts(unwrap(discountResult.value) || []) : []);
      setCombos(comboResult.status === 'fulfilled' ? bookingService.normalizeCombos(unwrap(comboResult.value) || []) : []);
      if (discountResult.status === 'rejected' && comboResult.status === 'rejected') {
        setNotice({ open: true, severity: 'error', message: 'Không thể tải danh sách ưu đãi.' });
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const loadLoyalty = async () => {
    if (!isLoggedIn) { setLoyalty(null); return; }
    setLoyaltyLoading(true);
    try {
      setLoyalty(unwrap(await bookingApi.fetchLoyaltyOverview()));
    } catch (error) {
      setNotice({ open: true, severity: 'error', message: error.message || 'Không thể tải điểm thưởng.' });
    } finally { setLoyaltyLoading(false); }
  };

  useEffect(() => {
    // The request deliberately owns the loading state for account changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLoyalty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const cards = useMemo(() => {
    const discountCards = discounts.map((item) => ({
      id: `discount-${item.id}`, type: 'discount', title: item.name, code: item.code,
      badge: item.type === 'PERCENTAGE' ? `Giảm ${item.value}%` : `Giảm ${money(item.value)}`,
      note: item.minPurchaseAmount ? `Áp dụng từ ${money(item.minPurchaseAmount)}` : 'Áp dụng cho đơn hợp lệ',
      extra: item.maxDiscountAmount ? `Giảm tối đa ${money(item.maxDiscountAmount)}` : 'Không giới hạn mức giảm', validTo: item.validTo,
    }));
    const comboCards = combos.map((item) => ({
      id: `combo-${item.id}`, type: 'combo', title: item.name, code: item.code || 'COMBO', badge: money(item.price),
      note: item.description || 'Combo ưu đãi tại quầy bắp nước', extra: 'Đang áp dụng', validTo: item.validTo,
    }));
    if (tab === TABS.DISCOUNTS) return discountCards;
    if (tab === TABS.COMBOS) return comboCards;
    return [...discountCards, ...comboCards];
  }, [combos, discounts, tab]);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((current) => current === code ? '' : current), 1600);
    } catch { setNotice({ open: true, severity: 'error', message: 'Không thể sao chép mã.' }); }
  };

  const openRedeemConfirmation = (reward) => {
    if (!reward?.affordable || redeemingId) return;
    setConfirmReward(reward);
  };

  const closeRedeemConfirmation = () => {
    if (!redeemingId) setConfirmReward(null);
  };

  const redeem = async () => {
    const reward = confirmReward;
    if (!reward?.affordable || redeemingId) return;
    setRedeemingId(reward.id);
    try {
      const redemption = unwrap(await bookingApi.redeemLoyaltyReward(reward.id));
      setConfirmReward(null);
      setNotice({ open: true, severity: 'success', message: `Đổi quà thành công. Mã: ${redemption.redemptionCode}` });
      await loadLoyalty();
    } catch (error) {
      setNotice({ open: true, severity: 'error', message: error.message || 'Không thể đổi quà lúc này.' });
    } finally { setRedeemingId(''); }
  };

  const iconFor = (type) => type === 'TICKET' ? <ConfirmationNumberRoundedIcon /> : type === 'COMBO' ? <FastfoodRoundedIcon /> : <LocalOfferRoundedIcon />;

  const renderRewards = () => {
    if (!isLoggedIn) return (
      <Stack alignItems="center" spacing={2.5} sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,.14)', color: 'primary.main' }}><LockRoundedIcon sx={{ fontSize: 34 }} /></Box>
        <Typography variant="h5" fontWeight={800}>Đăng nhập để xem điểm thưởng</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>Thành viên nhận 1 điểm cho mỗi 1.000₫ thực trả và có thể đổi vé, combo bắp nước hoặc voucher.</Typography>
        <Button component={RouterLink} to="/login" variant="contained" size="large">Đăng nhập</Button>
      </Stack>
    );
    return (
      <Stack spacing={4}>
        <Paper sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, background: 'linear-gradient(135deg, rgba(124,58,237,.30), rgba(15,23,42,.92))', border: '1px solid rgba(196,181,253,.22)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box><Typography color="text.secondary" fontWeight={700}>ĐIỂM KHẢ DỤNG</Typography><Typography variant="h3" fontWeight={900}>{(loyalty?.pointsBalance || 0).toLocaleString('vi-VN')} <Typography component="span" variant="h6" color="text.secondary">điểm</Typography></Typography></Box>
            <Stack direction="row" spacing={3} alignItems="center"><Box><Typography variant="caption" color="text.secondary">Đã tích</Typography><Typography fontWeight={800}>{(loyalty?.lifetimeEarned || 0).toLocaleString('vi-VN')}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Đã dùng</Typography><Typography fontWeight={800}>{(loyalty?.lifetimeRedeemed || 0).toLocaleString('vi-VN')}</Typography></Box></Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Mỗi {(loyalty?.vndPerPoint || 1000).toLocaleString('vi-VN')}₫ thực trả = 1 điểm. Điểm được cộng sau khi thanh toán vé thành công.</Typography>
        </Paper>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><CardGiftcardRoundedIcon color="primary" /><Typography variant="h5" fontWeight={850}>Quà có thể đổi</Typography></Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
            {(loyalty?.rewards || []).map((reward) => {
              const missing = Math.max(reward.pointsCost - (loyalty?.pointsBalance || 0), 0);
              return <Paper key={reward.id} sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(15,23,42,.78)', border: '1px solid rgba(148,163,184,.14)', display: 'flex', flexDirection: 'column', minHeight: 285 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"><Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,.15)', color: 'primary.main' }}>{iconFor(reward.rewardType)}</Box><Chip label={`${reward.pointsCost.toLocaleString('vi-VN')} điểm`} color="primary" /></Stack>
                <Typography variant="h6" fontWeight={850} sx={{ mt: 2 }}>{reward.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1, flex: 1 }}>{reward.description}</Typography><Typography variant="caption" color="text.secondary" sx={{ my: 1.5 }}>Mã có hạn {reward.validityDays} ngày sau khi đổi</Typography>
                <Button variant={reward.affordable ? 'contained' : 'outlined'} disabled={!reward.affordable || Boolean(redeemingId)} onClick={() => openRedeemConfirmation(reward)}>{redeemingId === reward.id ? 'Đang đổi...' : reward.affordable ? 'Đổi ngay' : `Cần thêm ${missing.toLocaleString('vi-VN')} điểm`}</Button>
              </Paper>;
            })}
          </Box>
        </Box>
        {(loyalty?.redemptions || []).length > 0 && <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><HistoryRoundedIcon color="primary" /><Typography variant="h5" fontWeight={850}>Mã đã đổi</Typography></Stack>
          <Stack spacing={1.5}>{loyalty.redemptions.map((item) => <Paper key={item.id} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(15,23,42,.58)', border: '1px solid rgba(148,163,184,.10)' }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}><Box><Typography fontWeight={800}>{item.rewardName}</Typography><Typography variant="caption" color="text.secondary">HSD: {dateText(item.expiresAt)} · {item.pointsSpent.toLocaleString('vi-VN')} điểm</Typography></Box><Stack direction="row" spacing={1} alignItems="center"><Chip size="small" label={item.status === 'AVAILABLE' ? 'Có thể dùng' : item.status === 'USED' ? 'Đã dùng' : 'Hết hạn'} color={item.status === 'AVAILABLE' ? 'success' : 'default'} /><Button disabled={item.status !== 'AVAILABLE'} onClick={() => copyCode(item.redemptionCode)} startIcon={copiedCode === item.redemptionCode ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}>{item.redemptionCode}</Button></Stack></Stack></Paper>)}</Stack>
        </Box>}
      </Stack>
    );
  };

  return <Box sx={{ pb: 8, color: 'text.primary' }}>
    <LoadingOverlay open={loading || (tab === TABS.REWARDS && loyaltyLoading)} message="Đang tải ưu đãi hiện có..." blur />
    <Box sx={{ borderBottom: '1px solid rgba(148,163,184,.08)', background: 'radial-gradient(circle at 80% 20%, rgba(251,191,36,.16), transparent 35%), linear-gradient(180deg,#0f172a,#0a0f1d)' }}><Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}><Stack spacing={2.5}><Typography variant="overline" color="primary.main" fontWeight={800}>ƯU ĐÃI THÀNH VIÊN</Typography><Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900 }}>Khuyến mãi, Combo & Đổi điểm</Typography><Typography color="text.secondary" sx={{ maxWidth: 720 }}>Tích điểm sau mỗi lần mua vé, đổi quà và dùng mã nhận được ngay tại bước thanh toán.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><Chip icon={<ConfirmationNumberRoundedIcon />} label={`${discounts.length} khuyến mãi vé`} /><Chip icon={<FastfoodRoundedIcon />} label={`${combos.length} combo bắp nước`} />{isLoggedIn && <Chip icon={<StarsRoundedIcon />} label={`${(loyalty?.pointsBalance || 0).toLocaleString('vi-VN')} điểm thưởng`} />}</Stack></Stack></Container></Box>
    <Container maxWidth="xl" sx={{ mt: 4 }}><Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid rgba(148,163,184,.08)' }}><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 3 }}><Tab value={TABS.ALL} label="Tất cả" /><Tab value={TABS.DISCOUNTS} label="Khuyến mãi vé" /><Tab value={TABS.COMBOS} label="Combo bắp nước" /><Tab value={TABS.REWARDS} label="Đổi điểm" /></Tabs>
      {tab === TABS.REWARDS ? renderRewards() : cards.length === 0 && !loading ? <EmptyState title="Chưa có ưu đãi phù hợp" description="Hiện chưa có ưu đãi trong nhóm này." /> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }, gap: 3 }}>{cards.map((item) => <Paper key={item.id} sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(15,23,42,.78)', border: '1px solid rgba(148,163,184,.12)', minHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}><Stack spacing={2}><Stack direction="row" justifyContent="space-between" spacing={2}><Stack direction="row" spacing={1.25}><Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,.16)', color: 'primary.main' }}>{item.type === 'combo' ? <FastfoodRoundedIcon /> : <LocalOfferRoundedIcon />}</Box><Box><Typography variant="overline" color="text.secondary">{item.type === 'combo' ? 'COMBO' : 'KHUYẾN MÃI'}</Typography><Typography variant="h6" fontWeight={800}>{item.title}</Typography></Box></Stack><Chip label={item.badge} color="primary" size="small" /></Stack><Box><Typography variant="body2" color="text.secondary">{item.note}</Typography><Typography variant="body2" color="text.secondary">{item.extra}</Typography></Box></Stack><Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Button variant="outlined" startIcon={copiedCode === item.code ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />} onClick={() => copyCode(item.code)}>{item.code}</Button><Stack direction="row" spacing={.5}><CalendarTodayRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} /><Typography variant="caption" color="text.secondary">HSD: {dateText(item.validTo)}</Typography></Stack></Stack></Paper>)}</Box>}
    </Paper></Container>
    <Dialog
      open={Boolean(confirmReward)}
      onClose={closeRedeemConfirmation}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 4,
          bgcolor: '#111827',
          backgroundImage: 'linear-gradient(145deg, rgba(124,58,237,.14), rgba(17,24,39,.98))',
          border: '1px solid rgba(196,181,253,.18)',
        },
      }}
    >
      <DialogTitle sx={{ pt: 3, pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,.15)', color: 'primary.main' }}>
            <CardGiftcardRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={850}>Xác nhận đổi điểm</Typography>
            <Typography variant="caption" color="text.secondary">Kiểm tra thông tin trước khi đổi quà</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(15,23,42,.66)', border: '1px solid rgba(148,163,184,.12)' }}>
          <Typography fontWeight={850}>{confirmReward?.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>{confirmReward?.description}</Typography>
          <Stack spacing={1.25} sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(148,163,184,.18)' }}>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Điểm hiện có</Typography><Typography fontWeight={800}>{(loyalty?.pointsBalance || 0).toLocaleString('vi-VN')} điểm</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Điểm sử dụng</Typography><Typography color="primary.main" fontWeight={850}>-{(confirmReward?.pointsCost || 0).toLocaleString('vi-VN')} điểm</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Còn lại</Typography><Typography fontWeight={850}>{Math.max((loyalty?.pointsBalance || 0) - (confirmReward?.pointsCost || 0), 0).toLocaleString('vi-VN')} điểm</Typography></Stack>
          </Stack>
        </Paper>
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2.5 }}>
          Điểm sẽ được trừ ngay sau khi xác nhận và không thể hoàn lại.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={closeRedeemConfirmation} disabled={Boolean(redeemingId)} color="inherit">Hủy</Button>
        <Button onClick={redeem} disabled={Boolean(redeemingId)} variant="contained" startIcon={redeemingId ? <CircularProgress size={17} color="inherit" /> : <CardGiftcardRoundedIcon />}>
          {redeemingId ? 'Đang đổi...' : 'Xác nhận đổi'}
        </Button>
      </DialogActions>
    </Dialog>
    <Snackbar open={notice.open} autoHideDuration={4000} onClose={() => setNotice((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}><Alert severity={notice.severity} variant="filled">{notice.message}</Alert></Snackbar>
  </Box>;
};

export default PromotionsPage;
