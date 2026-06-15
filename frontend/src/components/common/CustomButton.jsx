import { Button } from '@mui/material';

export const CustomButton = ({
  variant = 'primary', // primary (gold), secondary (red), outlined, text
  children,
  sx = {},
  ...props
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #FDE047 0%, #FBBF24 100%)',
            boxShadow: '0 6px 20px rgba(251, 191, 36, 0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(1px)',
          },
        };
      case 'secondary':
        return {
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(1px)',
          },
        };
      case 'outlined':
        return {
          variant: 'outlined',
          borderColor: 'rgba(248, 250, 252, 0.23)',
          color: 'text.primary',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(251, 191, 36, 0.05)',
            color: 'primary.main',
          },
        };
      case 'text':
        return {
          variant: 'text',
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main',
            bgcolor: 'rgba(251, 191, 36, 0.05)',
          },
        };
      default:
        return {};
    }
  };

  const currentStyles = getStyles();
  const muiVariant = variant === 'outlined' ? 'outlined' : variant === 'text' ? 'text' : 'contained';

  return (
    <Button
      variant={muiVariant}
      sx={{
        ...currentStyles,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
