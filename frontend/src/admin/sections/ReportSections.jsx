import { useState } from 'react';
import { Box, Chip, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import SectionHeader from '../components/SectionHeader';

const thSx = { color: 'rgba(255,255,255,0.45)', fontWeight: 600 };

const REVENUE_DAY = [
  { label: '01/06', value: 42 },
  { label: '02/06', value: 58 },
  { label: '03/06', value: 45 },
  { label: '04/06', value: 72 },
  { label: '05/06', value: 91 },
];

const REVENUE_MONTH = [
  { label: 'T1', amount: '₫1.2B' },
  { label: 'T2', amount: '₫1.5B' },
  { label: 'T3', amount: '₫1.8B' },
  { label: 'T4', amount: '₫2.1B' },
  { label: 'T5', amount: '₫2.4B' },
];

const REVENUE_MOVIE = [
  { movie: 'Spider-Verse', amount: '₫840M', pct: 35 },
  { movie: 'Dune: Part Two', amount: '₫620M', pct: 26 },
  { movie: 'Inception', amount: '₫480M', pct: 20 },
];

export const RevenueReportSection = () => {
  const [tab, setTab] = useState(0);
  const max = Math.max(...REVENUE_DAY.map((d) => d.value));

  return (
    <>
      <SectionHeader title="Báo cáo doanh thu" subtitle="Theo ngày · tháng · phim" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 600 } }}>
        <Tab label="Theo ngày" />
        <Tab label="Theo tháng" />
        <Tab label="Theo phim" />
      </Tabs>
      {tab === 0 && (
        <Box className="admin-panel" sx={{ p: 3 }}>
          <Stack direction="row" alignItems="flex-end" sx={{ height: 140, gap: 1.5 }}>
            {REVENUE_DAY.map((d) => (
              <Stack key={d.label} alignItems="center" sx={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <Box className="admin-chart-bar" sx={{ width: '100%', maxWidth: 40, height: `${(d.value / max) * 100}%` }} />
                <Typography variant="caption" sx={{ mt: 1, opacity: 0.5 }}>
                  {d.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Tổng tuần: <strong style={{ color: '#4ade80' }}>₫308M</strong>
          </Typography>
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, gap: 1.5 }}>
          {REVENUE_MONTH.map((m) => (
            <Box key={m.label} className="admin-panel admin-stat-card" sx={{ p: 2, textAlign: 'center', '--accent': '#f59e0b' }}>
              <Typography variant="caption" color="text.secondary">
                {m.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                {m.amount}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {tab === 2 && (
        <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Phim</TableCell>
                  <TableCell sx={thSx}>Doanh thu</TableCell>
                  <TableCell sx={thSx}>Tỷ trọng</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {REVENUE_MOVIE.map((r) => (
                  <TableRow key={r.movie} className="admin-table-row">
                    <TableCell>
                      <Typography fontWeight={600}>{r.movie}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#4ade80', fontWeight: 700 }}>{r.amount}</TableCell>
                    <TableCell>
                      <Chip label={`${r.pct}%`} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </>
  );
};

export const TicketsReportSection = () => (
  <>
    <SectionHeader title="Thống kê vé" subtitle="Vé bán ra và vé hủy" />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Box className="admin-panel admin-stat-card" sx={{ p: 3, '--accent': '#22c55e' }}>
        <Typography color="text.secondary">Vé bán ra</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
          12,480
        </Typography>
        <Chip label="+15% tháng này" size="small" sx={{ mt: 2, bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700 }} />
      </Box>
      <Box className="admin-panel admin-stat-card" sx={{ p: 3, '--accent': '#ef4444' }}>
        <Typography color="text.secondary">Vé hủy</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
          342
        </Typography>
        <Chip label="2.7% tỷ lệ hủy" size="small" sx={{ mt: 2, bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700 }} />
      </Box>
    </Box>
    <Box className="admin-panel" sx={{ p: 3, mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Xu hướng 7 ngày
      </Typography>
      <Stack spacing={1.5}>
        {[
          { day: 'T2', sold: 420, cancelled: 12 },
          { day: 'T3', sold: 510, cancelled: 18 },
          { day: 'T4', sold: 380, cancelled: 9 },
          { day: 'T5', sold: 620, cancelled: 22 },
        ].map((d) => (
          <Stack key={d.day} direction="row" alignItems="center" spacing={2}>
            <Typography sx={{ width: 28, opacity: 0.5 }}>{d.day}</Typography>
            <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
              <Box sx={{ width: `${(d.sold / 650) * 100}%`, bgcolor: '#22c55e' }} />
              <Box sx={{ width: `${(d.cancelled / 650) * 100}%`, bgcolor: '#ef4444' }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 80 }}>
              {d.sold} / <span style={{ color: '#f87171' }}>{d.cancelled}</span>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  </>
);

export const CustomersReportSection = () => (
  <>
    <SectionHeader title="Thống kê khách hàng" subtitle="Khách mới và khách thân thiết" />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
      <Box className="admin-panel admin-stat-card" sx={{ p: 3, '--accent': '#6366f1' }}>
        <Typography color="text.secondary">Khách hàng mới (tháng)</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
          186
        </Typography>
        <Typography variant="caption" color="text.secondary">
          +24 so với tháng trước
        </Typography>
      </Box>
      <Box className="admin-panel admin-stat-card" sx={{ p: 3, '--accent': '#e50914' }}>
        <Typography color="text.secondary">Khách thân thiết</Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
          412
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ≥ 5 lượt đặt trong 6 tháng
        </Typography>
      </Box>
    </Box>
    <Box className="admin-panel" sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={thSx}>Hạng</TableCell>
              <TableCell sx={thSx}>Số khách</TableCell>
              <TableCell sx={thSx}>Chi tiêu TB</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { tier: 'Bạc', count: 280, spend: '₫450K' },
              { tier: 'Vàng', count: 98, spend: '₫1.2M' },
              { tier: 'Bạch kim', count: 34, spend: '₫2.8M' },
            ].map((row) => (
              <TableRow key={row.tier} className="admin-table-row">
                <TableCell>
                  <Typography fontWeight={700}>{row.tier}</Typography>
                </TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell sx={{ color: '#4ade80' }}>{row.spend}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </>
);
