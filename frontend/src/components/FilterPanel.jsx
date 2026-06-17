import { Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { t } from '../i18n/labels';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
};

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
        border: '1px solid rgba(148, 163, 184, 0.14)',
        borderRadius: 4,
        p: { xs: 2.5, sm: 3 },
        backgroundColor: 'background.paper',
        boxShadow: '0 18px 45px rgba(0, 0, 0, 0.22)',
        mb: { xs: 5, md: 6 },
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: 800,
          color: 'text.primary',
        }}
      >
        {t('movies', 'searchTitle')}
      </Typography>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label={t('movies', 'searchByName')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <TextField
            fullWidth
            select
            label={t('movies', 'genre')}
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            sx={fieldSx}
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
            label={t('movies', 'location')}
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            sx={fieldSx}
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
