import { Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';

const FilterPanel = ({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories = [],
  location,
  onLocationChange,
  locations = [],
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '18px',
        p: { xs: 2.5, sm: 3 },
        backgroundColor: '#141414',
        mb: { xs: 5, md: 6 },
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.01em',
        }}
      >
        Tìm kiếm phim
      </Typography>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="Tìm phim theo tên"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <TextField
            fullWidth
            select
            label="Thể loại"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
              },
            }}
          >
            {categories.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <TextField
            fullWidth
            select
            label="Khu vực"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
              },
            }}
          >
            {locations.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FilterPanel;
