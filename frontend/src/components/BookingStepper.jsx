import { Box, Step, StepLabel, Stepper, useMediaQuery, useTheme } from '@mui/material';

const STEPS = [
  'Chọn suất chiếu',
  'Chọn ghế',
  'Xác nhận đặt vé',
  'Thanh toán',
  'Hoàn tất'
];

export const BookingStepper = ({ activeStep = 0 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ width: '100%', py: { xs: 2, md: 4 } }}>
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel={!isMobile} 
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{
          '& .MuiStepIcon-root': {
            color: 'background.paper',
            border: '2px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            transition: 'all 0.3s ease',
            '&.Mui-active': {
              color: 'primary.main',
              borderColor: 'primary.main',
              boxShadow: '0 0 12px rgba(251, 191, 36, 0.4)',
              '& .MuiStepIcon-text': {
                fill: 'primary.contrastText',
                fontWeight: 800,
              }
            },
            '&.Mui-completed': {
              color: 'success.main',
              borderColor: 'success.main',
            }
          },
          '& .MuiStepLabel-label': {
            color: 'text.secondary',
            fontWeight: 600,
            mt: { xs: 0, sm: 1 },
            fontSize: { xs: '0.85rem', sm: '0.9rem' },
            '&.Mui-active': {
              color: 'primary.main',
              fontWeight: 700,
            },
            '&.Mui-completed': {
              color: 'text.primary',
            }
          },
          '& .MuiStepConnector-line': {
            borderColor: 'rgba(148, 163, 184, 0.12)',
            borderWidth: 2,
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: 'primary.main',
          },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: 'success.main',
          }
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default BookingStepper;
