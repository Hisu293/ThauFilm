import { Box, CircularProgress, Typography, Fade } from '@mui/material';

export const LoadingOverlay = ({
  open = true,
  message = 'Đang xử lý...',
  blur = false,
  fullScreen = false,
}) => {
  return (
    <Fade in={open} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: fullScreen ? 'fixed' : 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: blur ? 'blur(8px)' : 'none',
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
            filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))',
          }}
        />
        {message && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              letterSpacing: '0.02em',
              animation: 'pulse 1.5s infinite ease-in-out',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.6 },
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
