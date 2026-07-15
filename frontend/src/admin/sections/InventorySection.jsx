import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import SectionHeader from '../components/SectionHeader';
import { adminService } from '../../services/adminService';

const emptyItem = { name: '', unit: 'phần', currentStock: 0, reorderLevel: 10, active: true };
const riskMeta = {
  CRITICAL: { label: 'Nguy cơ hết hàng', color: 'error' },
  WARNING: { label: 'Cần theo dõi', color: 'warning' },
  HEALTHY: { label: 'Ổn định', color: 'success' },
};

const InventorySection = () => {
  const [data, setData] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);
  const [recipe, setRecipe] = useState({ comboId: '', inventoryItemId: '', quantityPerCombo: 1 });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [forecast, recipeRows, comboRows] = await Promise.all([
        adminService.getInventoryForecast(), adminService.getInventoryRecipes(), adminService.getInventoryCombos(),
      ]);
      setData(forecast); setRecipes(recipeRows || []); setCombos(comboRows || []);
    } catch (e) { setError(e.message || 'Không tải được dữ liệu tồn kho.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const saveItem = async () => {
    try {
      if (item.id) await adminService.updateInventoryItem(item.id, item);
      else await adminService.createInventoryItem(item);
      setItem(null); await load();
    } catch (e) { setError(e.message || 'Không lưu được mặt hàng.'); }
  };
  const saveRecipe = async () => {
    try { await adminService.saveInventoryRecipe({ ...recipe, quantityPerCombo: Number(recipe.quantityPerCombo) }); await load(); }
    catch (e) { setError(e.message || 'Không lưu được định lượng combo.'); }
  };

  return <>
    <SectionHeader title="Dự đoán sắp hết hàng" subtitle="Dựa trên combo đã thanh toán hôm nay, tồn kho hiện tại và định lượng thực tế" />
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box> : <Stack spacing={2.5}>
      {data?.warningCount > 0 && <Alert severity="warning" icon={<TrendingDownRoundedIcon />}><b>{data.warningCount} mặt hàng cần chú ý.</b> Cập nhật tồn kho hoặc chuẩn bị nhập thêm để tránh gián đoạn bán combo.</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {(data?.forecasts || []).map((row) => <Box key={row.id} className="admin-panel" sx={{ p: 2.5, border: row.risk === 'CRITICAL' ? '1px solid rgba(239,68,68,.55)' : undefined }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Inventory2RoundedIcon color={row.risk === 'CRITICAL' ? 'error' : 'primary'} /><Chip size="small" color={riskMeta[row.risk].color} label={riskMeta[row.risk].label} /></Stack>
          <Typography variant="h6" fontWeight={900} sx={{ mt: 2 }}>{row.name}</Typography>
          <Typography variant="h3" fontWeight={950}>{Number(row.currentStock).toLocaleString('vi-VN')} <Typography component="span" color="text.secondary">{row.unit}</Typography></Typography>
          <Typography color={row.risk === 'CRITICAL' ? 'error.main' : 'text.secondary'} fontWeight={700} sx={{ mt: 1 }}>{row.message}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Đã dùng hôm nay: {row.consumedToday} · Tốc độ: {row.burnRatePerHour}/{row.unit}/giờ</Typography>
          <Button size="small" sx={{ mt: 1.5 }} onClick={() => setItem({ ...row })}>Cập nhật tồn kho</Button>
        </Box>)}
        {!(data?.forecasts || []).length && <Alert severity="info">Hãy tạo mặt hàng như bắp rang, nước ngọt và khai báo định lượng combo để bắt đầu dự báo.</Alert>}
      </Box>
      <Box className="admin-panel" sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'center' }}><Box><Typography variant="h6" fontWeight={900}>Cấu hình định lượng combo</Typography><Typography color="text.secondary">Ví dụ: một combo dùng 1 phần bắp; hệ thống chỉ tính booking đã thanh toán.</Typography></Box><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setItem({ ...emptyItem })}>Thêm mặt hàng</Button></Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr .7fr auto' }, gap: 1.5, mt: 2 }}>
          <FormControl size="small"><InputLabel>Combo</InputLabel><Select label="Combo" value={recipe.comboId} onChange={(e) => setRecipe((old) => ({ ...old, comboId: e.target.value }))}>{combos.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl>
          <FormControl size="small"><InputLabel>Mặt hàng</InputLabel><Select label="Mặt hàng" value={recipe.inventoryItemId} onChange={(e) => setRecipe((old) => ({ ...old, inventoryItemId: e.target.value }))}>{(data?.forecasts || []).map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}</Select></FormControl>
          <TextField size="small" type="number" label="Định lượng / combo" value={recipe.quantityPerCombo} onChange={(e) => setRecipe((old) => ({ ...old, quantityPerCombo: e.target.value }))} />
          <Button variant="outlined" disabled={!recipe.comboId || !recipe.inventoryItemId} onClick={saveRecipe}>Lưu định lượng</Button>
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>{recipes.map((r) => <Chip key={r.id} label={`${r.comboName}: ${r.quantityPerCombo} ${r.inventoryItemName}`} />)}</Stack>
      </Box>
    </Stack>}
    <Dialog open={Boolean(item)} onClose={() => setItem(null)} fullWidth maxWidth="sm"><DialogTitle>{item?.id ? 'Cập nhật tồn kho' : 'Thêm mặt hàng tồn kho'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Tên mặt hàng" value={item?.name || ''} onChange={(e) => setItem((old) => ({ ...old, name: e.target.value }))} /><TextField label="Đơn vị" value={item?.unit || ''} onChange={(e) => setItem((old) => ({ ...old, unit: e.target.value }))} /><TextField type="number" label="Tồn kho hiện tại" value={item?.currentStock ?? 0} onChange={(e) => setItem((old) => ({ ...old, currentStock: Number(e.target.value) }))} /><TextField type="number" label="Ngưỡng cần nhập thêm" value={item?.reorderLevel ?? 0} onChange={(e) => setItem((old) => ({ ...old, reorderLevel: Number(e.target.value) }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setItem(null)}>Hủy</Button><Button variant="contained" onClick={saveItem} disabled={!item?.name || !item?.unit}>Lưu</Button></DialogActions></Dialog>
  </>;
};

export default InventorySection;
