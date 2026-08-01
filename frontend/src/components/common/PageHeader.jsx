import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/labels';

export const PageHeader = ({ title, subtitle, onBack, backText = t('common', 'back') }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <Box sx={{ mb: { xs: 3, md: 4 }, mt: { xs: 1, md: 2 } }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={handleBack}
        sx={{
          color: 'text.secondary',
          mb: 2,
          pl: 0,
          fontWeight: 700,
          '&:hover': {
            color: 'primary.main',
            bgcolor: 'transparent',
            transform: 'translateX(-4px)',
          },
        }}
      >
        {backText}
      </Button>
      <Stack spacing={0.75}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 900,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #FFFFFF 20%, #FBBF24 92%)'
              : 'linear-gradient(45deg, #172033 20%, #D89400 92%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 0,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default PageHeader;
