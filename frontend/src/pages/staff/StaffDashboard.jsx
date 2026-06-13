import { Box, Grid, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VideocamIcon from '@mui/icons-material/Videocam';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageHeader from '../../components/ui/PageHeader';
import StatisticCard from '../../components/ui/StatisticCard';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { dashboardStats, recentCheckIns } from '../../data/mockStaffData';

const StaffDashboard = () => {
  const breadcrumbs = [
    { label: 'Staff', path: '/staff/dashboard' },
    { label: 'Dashboard' }
  ];

  const tableColumns = [
    { id: 'id', label: 'Ticket ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'movie', label: 'Movie' },
    { id: 'time', label: 'Time' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => <StatusChip status={row.status} />
    }
  ];

  return (
    <Box>
      <PageHeader title="Overview" breadcrumbs={breadcrumbs} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Today's Revenue"
            value={dashboardStats.todayRevenue}
            icon={<AttachMoneyIcon />}
            trend={dashboardStats.revenueTrend}
            trendValue={dashboardStats.revenueTrendValue}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Total Tickets Sold"
            value={dashboardStats.totalTicketsSold}
            icon={<ConfirmationNumberIcon />}
            trend={dashboardStats.ticketsTrend}
            trendValue={dashboardStats.ticketsTrendValue}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Checked-in Tickets"
            value={dashboardStats.checkedInTickets}
            icon={<CheckCircleIcon />}
            trend={dashboardStats.checkInTrend}
            trendValue={dashboardStats.checkInTrendValue}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatisticCard
            title="Active Screenings"
            value={dashboardStats.activeScreenings}
            icon={<VideocamIcon />}
            trend={dashboardStats.screeningsTrend}
            trendValue={dashboardStats.screeningsTrendValue}
            color="warning"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Recent Check-ins
      </Typography>
      <DataTable
        columns={tableColumns}
        data={recentCheckIns}
        page={0}
        rowsPerPage={5}
        totalCount={recentCheckIns.length}
      />
    </Box>
  );
};

export default StaffDashboard;
