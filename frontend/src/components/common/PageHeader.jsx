import { Box, Button, Typography, Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';

export const PageHeader = ({ title, subtitle, onBack, backText = 'Quay lại' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <Box sx={{ mb: 4, mt: 2 }}>
      {handleBack && (
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={handleBack}
          sx={{
            color: 'text.secondary',
            mb: 2,
            pl: 0,
            '&:hover': {
              color: 'primary.main',
              bgcolor: 'transparent',
              transform: 'translateX(-4px)',
            },
          }}
        >
          {backText}
        </Button>
      )}
      <Stack spacing={0.5}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(45deg, #FFFFFF 30%, #FBBF24 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default PageHeader;
