import { Box, Typography, alpha, useTheme } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

const EmptyState = ({ message = "No items found", icon }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider'
      }}
    >
      <Box 
        sx={{ 
          color: 'text.disabled', 
          mb: 2,
          '& > svg': { fontSize: 64 }
        }}
      >
        {icon || <InboxIcon />}
      </Box>
      <Typography variant="h6" color="text.secondary" fontWeight="medium">
        {message}
      </Typography>
    </Box>
  );
};

export default EmptyState;
