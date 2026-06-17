import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import FastfoodRoundedIcon from '@mui/icons-material/FastfoodRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';

import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyState from '../components/common/EmptyState';
import { bookingApi } from '../api/bookingApi';
import { bookingService } from '../services/bookingService';

const TAB_ALL = 'all';
const TAB_DISCOUNTS = 'discounts';
const TAB_COMBOS = 'combos';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không giới hạn';
  return date.toLocaleDateString('vi-VN');
};

const getDiscountBadge = (discount) => {
  if (discount.type === 'PERCENTAGE') {
    return `Giảm ${discount.value}%`;
  }
  return `Giảm ${formatCurrency(discount.value)}`;
};

const PromotionsPage = () => {
  const [tab, setTab] = useState(TAB_ALL);
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    let active = true;

    const loadPromotions = async () => {
      setLoading(true);
      try {
        const [discountRes, comboRes] = await Promise.allSettled([
          bookingApi.fetchActiveDiscounts(),
          bookingApi.fetchActiveCombos(),
        ]);

        if (!active) return;

        if (discountRes.status === 'fulfilled') {
          const rawDiscounts = discountRes.value?.data ?? discountRes.value ?? [];
          setDiscounts(bookingService.normalizeDiscounts(rawDiscounts));
        } else {
          setDiscounts([]);
        }

        if (comboRes.status === 'fulfilled') {
          const rawCombos = comboRes.value?.data ?? comboRes.value ?? [];
          setCombos(bookingService.normalizeCombos(rawCombos));
        } else {
          setCombos([]);
        }

        if (discountRes.status === 'rejected' && comboRes.status === 'rejected') {
          throw discountRes.reason || comboRes.reason;
        }
      } catch (error) {
        if (!active) return;
        setSnackbar({
          open: true,
          message: error.message || 'Không thể tải danh sách khuyến mãi hiện có.',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPromotions();
    return () => {
      active = false;
    };
  }, []);

  const promotionCards = useMemo(() => {
    const discountCards = discounts.map((discount) => ({
      id: `discount-${discount.id}`,
      type: 'discount',
      icon: <LocalOfferRoundedIcon sx={{ fontSize: 20 }} />,
      title: discount.name,
      code: discount.code,
      badge: getDiscountBadge(discount),
      note:
        discount.minPurchaseAmount > 0
          ? `Áp dụng từ ${formatCurrency(discount.minPurchaseAmount)}`
          : 'Áp dụng cho đơn hợp lệ',
      extra:
        discount.maxDiscountAmount > 0
          ? `Giảm tối đa ${formatCurrency(discount.maxDiscountAmount)}`
          : 'Không giới hạn mức giảm',
      validTo: discount.validTo,
    }));

    const comboCards = combos.map((combo) => ({
      id: `combo-${combo.id}`,
      type: 'combo',
      icon: <FastfoodRoundedIcon sx={{ fontSize: 20 }} />,
      title: combo.name,
      code: combo.code || 'COMBO',
      badge: combo.price > 0 ? formatCurrency(combo.price) : 'Đang mở bán',
      note: combo.description || 'Combo ưu đãi tại quầy bắp nước',
      extra: combo.validTo ? `Hiệu lực đến ${formatDate(combo.validTo)}` : 'Đang áp dụng',
      validTo: combo.validTo,
    }));

    if (tab === TAB_DISCOUNTS) return discountCards;
    if (tab === TAB_COMBOS) return comboCards;
    return [...discountCards, ...comboCards];
  }, [combos, discounts, tab]);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((current) => (current === code ? '' : current));
      }, 1600);
    } catch {
      setSnackbar({
        open: true,
        message: 'Không thể sao chép mã. Bạn thử lại giúp mình nhé.',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '' });
  };

  return (
    <Box sx={{ pb: 8, color: 'text.primary' }}>
      <LoadingOverlay open={loading} message="Đang tải ưu đãi hiện có..." blur />

      <Box
        sx={{
          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
          background:
            'radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.16) 0%, rgba(0,0,0,0) 35%), linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,15,29,0.98) 100%)',
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
          <Stack spacing={2.5}>
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
              ƯU ĐÃI THÀNH VIÊN
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900, lineHeight: 1.05 }}>
              Khuyến mãi & Combo hiện có
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              Danh sách này đang lấy trực tiếp từ API thành viên. Bạn có thể sao chép mã giảm giá ngay trên trang và chọn ưu đãi
              khi đi tới bước thanh toán.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Chip
                icon={<ConfirmationNumberRoundedIcon />}
                label={`${discounts.length} khuyến mãi vé`}
                sx={{ bgcolor: 'rgba(251, 191, 36, 0.14)', color: 'text.primary' }}
              />
              <Chip
                icon={<FastfoodRoundedIcon />}
                label={`${combos.length} combo bắp nước`}
                sx={{ bgcolor: 'rgba(96, 165, 250, 0.14)', color: 'text.primary' }}
              />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            bgcolor: 'background.paper',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              mb: 3,
              '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 3, borderRadius: 999 },
            }}
          >
            <Tab value={TAB_ALL} label="Tất cả" />
            <Tab value={TAB_DISCOUNTS} label="Khuyến mãi vé" />
            <Tab value={TAB_COMBOS} label="Combo bắp nước" />
          </Tabs>

          {promotionCards.length === 0 && !loading ? (
            <EmptyState
              title="Chưa có ưu đãi phù hợp"
              description="Hiện tại chưa có khuyến mãi hoặc combo khả dụng trong nhóm này."
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 3,
              }}
            >
              {promotionCards.map((item) => (
                <Paper
                  key={item.id}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
                      borderColor: 'rgba(251, 191, 36, 0.32)',
                    },
                  }}
                >
                  <Stack spacing={2.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: item.type === 'combo' ? 'rgba(96,165,250,0.16)' : 'rgba(251,191,36,0.16)',
                            color: item.type === 'combo' ? '#93C5FD' : 'primary.main',
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box>
                          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                            {item.type === 'combo' ? 'COMBO' : 'KHUYẾN MÃI'}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                            {item.title}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip label={item.badge} color="primary" size="small" />
                    </Stack>

                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {item.note}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.extra}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                    <Button
                      variant="outlined"
                      startIcon={copiedCode === item.code ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                      onClick={() => copyCode(item.code)}
                      sx={{
                        borderRadius: 3,
                        borderStyle: 'dashed',
                        justifyContent: 'flex-start',
                        px: 1.75,
                        fontWeight: 800,
                      }}
                    >
                      {item.code}
                    </Button>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        HSD: {formatDate(item.validTo)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="info" variant="filled" sx={{ borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromotionsPage;
