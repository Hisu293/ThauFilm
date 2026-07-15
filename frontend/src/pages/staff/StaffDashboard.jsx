import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Grid, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VideocamIcon from '@mui/icons-material/Videocam';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageHeader from '../../components/ui/PageHeader';
import StatisticCard from '../../components/ui/StatisticCard';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { staffReportService } from '../../services/staffReportService';
import useStaffList from '../../hooks/useStaffList';

const DASHBOARD_DATE_FIELDS = ['time', 'checkedInAt', 'createdAt'];
const matchesCheckInSearch = (checkIn, query) =>
  [checkIn.id, checkIn.customer, checkIn.movie, checkIn.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const StaffDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashboardStats(await staffReportService.dashboard());
    } catch (err) {
      setError(err.message || 'Không thể tải thống kê nhân viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  const breadcrumbs = [
    { label: 'Staff', path: '/staff/dashboard' },
    { label: 'Dashboard' }
  ];

  const tableColumns = [
    { id: 'id', label: 'Ticket ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'movie', label: 'Movie' },
    { id: 'time', label: 'Time', render: (row) => row.time ? new Date(row.time).toLocaleString('vi-VN') : '—' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => <StatusChip status={row.status} />
    }
  ];

  const recentCheckIns = dashboardStats?.recentCheckIns || [];
  const {
    search,
    page,
    setPage,
    handleSearchChange,
    filteredItems,
    paginatedItems,
    rowsPerPage,
  } = useStaffList({
    items: recentCheckIns,
    matchesSearch: matchesCheckInSearch,
    dateFields: DASHBOARD_DATE_FIELDS,
    rowsPerPage: 5,
  });
  const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardStats?.todayRevenue || 0);

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" action={<Button onClick={loadDashboard}>Thử lại</Button>}>{error}</Alert>;
  if (!dashboardStats) {
    return <EmptyState title="Chưa có dữ liệu tổng quan" description="Dữ liệu thống kê Staff hiện đang trống." />;
  }

  return (
    <Box>
      <PageHeader title="Overview" breadcrumbs={breadcrumbs} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Today's Revenue"
            value={currency}
            icon={<AttachMoneyIcon />}
            trend={dashboardStats.revenueTrend}
            trendValue={dashboardStats.revenueTrendValue}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Tickets Sold Today"
            value={dashboardStats.totalTicketsSold}
            icon={<ConfirmationNumberIcon />}
            trend={dashboardStats.ticketsTrend}
            trendValue={dashboardStats.ticketsTrendValue}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Total Checked-in Tickets"
            value={dashboardStats.checkedInTickets}
            icon={<CheckCircleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Active Screenings"
            value={dashboardStats.activeScreenings}
            icon={<VideocamIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Recent Check-ins
      </Typography>
      <Box sx={{ mb: 2, maxWidth: { sm: 360 } }}>
        <SearchBar
          placeholder="Tìm mã vé, khách hàng hoặc phim…"
          value={search}
          onChange={handleSearchChange}
        />
      </Box>
      <DataTable
        columns={tableColumns}
        data={paginatedItems}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filteredItems.length}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        emptyMessage="Không có lượt check-in nào phù hợp."
      />
    </Box>
  );
};

export default StaffDashboard;
