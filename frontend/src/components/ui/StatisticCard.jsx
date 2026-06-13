import { Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatisticCard = ({ title, value, icon, trend, trendValue, color = 'primary' }) => {
  const theme = useTheme();
  const mainColor = theme.palette[color]?.main || theme.palette.primary.main;
  const isPositive = trend === 'up';

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
          borderColor: alpha(mainColor, 0.3)
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: alpha(mainColor, 0.1),
              color: mainColor,
            }}
          >
            {icon}
          </Box>
          {trendValue && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5,
                color: isPositive ? 'success.main' : 'error.main',
                bgcolor: isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                px: 1,
                py: 0.5,
                borderRadius: 1,
                typography: 'caption',
                fontWeight: 'bold'
              }}
            >
              {isPositive ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
              {trendValue}
            </Box>
          )}
        </Box>
        <Typography color="text.secondary" variant="body2" fontWeight="medium" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default StatisticCard;
