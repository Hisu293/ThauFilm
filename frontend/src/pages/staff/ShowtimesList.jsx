import { useState, useMemo } from 'react';
import { Box, Card, CardContent, Grid, MenuItem, TextField, Typography, LinearProgress } from '@mui/material';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { showtimesData } from '../../data/mockStaffData';

const ShowtimesList = () => {
  const [filterMovie, setFilterMovie] = useState('All');
  const [filterDate, setFilterDate] = useState('2026-06-08');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const breadcrumbs = [
    { label: 'Staff', path: '/staff/dashboard' },
    { label: 'Showtimes' }
  ];

  // Extract unique movies for filter
  const uniqueMovies = useMemo(() => {
    const movies = new Set(showtimesData.map(item => item.movieName));
    return ['All', ...Array.from(movies)];
  }, []);

  const filteredData = useMemo(() => {
    return showtimesData.filter(item => {
      const matchMovie = filterMovie === 'All' || item.movieName === filterMovie;
      const matchDate = !filterDate || item.showDate === filterDate;
      return matchMovie && matchDate;
    });
  }, [filterMovie, filterDate]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const tableColumns = [
    { id: 'movieName', label: 'Movie Name' },
    { 
      id: 'showTime', 
      label: 'Showtime',
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">{row.showTime}</Typography>
          <Typography variant="caption" color="text.secondary">{row.showDate}</Typography>
        </Box>
      )
    },
    { id: 'room', label: 'Theater Room' },
    { 
      id: 'seats', 
      label: 'Occupancy',
      render: (row) => {
        const percentage = Math.round((row.soldSeats / row.totalSeats) * 100);
        return (
          <Box sx={{ width: '100%', minWidth: 150 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight="medium">
                {row.soldSeats} / {row.totalSeats} seats
              </Typography>
              <Typography variant="caption" fontWeight="bold" color={percentage > 90 ? 'error.main' : 'text.secondary'}>
                {percentage}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={percentage} 
              color={percentage > 90 ? 'error' : percentage > 70 ? 'warning' : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        );
      }
    },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => <StatusChip status={row.status} />
    }
  ];

  return (
    <Box>
      <PageHeader title="Showtimes Management" breadcrumbs={breadcrumbs} />
      
      <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter by Movie"
                value={filterMovie}
                onChange={(e) => setFilterMovie(e.target.value)}
              >
                {uniqueMovies.map((movie) => (
                  <MenuItem key={movie} value={movie}>
                    {movie}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                type="date"
                fullWidth
                size="small"
                label="Filter by Date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <DataTable
        columns={tableColumns}
        data={filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filteredData.length}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default ShowtimesList;
