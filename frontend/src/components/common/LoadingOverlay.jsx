import { Box, CircularProgress, Fade, Typography } from '@mui/material';
import { t } from '../../i18n/labels';

export const LoadingOverlay = ({
  open = true,
  message = t('common', 'loading'),
  blur = false,
  fullScreen = false,
}) => {
  return (
    <Fade in={open} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: fullScreen ? 'fixed' : 'absolute',
          inset: 0,
          bgcolor: 'rgba(11, 16, 32, 0.84)',
          backdropFilter: blur ? 'blur(10px)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: fullScreen ? 9999 : 10,
          borderRadius: fullScreen ? 0 : 'inherit',
          transition: 'all 0.3s ease',
        }}
      >
        <CircularProgress
          size={50}
          thickness={4}
          sx={{
            color: 'primary.main',
            mb: 2,
            filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.36))',
          }}
        />
        {message && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              animation: 'pulse 1.5s infinite ease-in-out',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.62 },
                '50%': { opacity: 1 },
              },
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );
};

export default LoadingOverlay;
